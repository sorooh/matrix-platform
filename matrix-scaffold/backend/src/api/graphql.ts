import { FastifyInstance } from 'fastify'
import { buildSchema, GraphQLObjectType, GraphQLString, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLInt, GraphQLBoolean } from 'graphql'
import mercurius from 'mercurius'
import { User, Project, Deployment } from '../models'
import { ApiVersion, hasFeature } from './versioning'

// GraphQL Schema Types
const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: GraphQLString },
    avatar: { type: GraphQLString },
    tier: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
    projects: {
      type: new GraphQLList(ProjectType),
      resolve: async (user) => {
        return await Project.find({ userId: user.id }).limit(20)
      }
    },
    stats: {
      type: UserStatsType,
      resolve: async (user) => {
        const totalProjects = await Project.countDocuments({ userId: user.id })
        const totalDeployments = await Deployment.countDocuments({ userId: user.id })
        const activeProjects = await Project.countDocuments({ 
          userId: user.id, 
          status: 'active' 
        })
        
        return {
          totalProjects,
          totalDeployments,
          activeProjects,
          storageUsed: user.storageUsed || 0
        }
      }
    }
  })
})

const ProjectType = new GraphQLObjectType({
  name: 'Project',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    repository: { type: RepositoryType },
    status: { type: GraphQLString },
    visibility: { type: GraphQLString },
    framework: { type: GraphQLString },
    domain: { type: GraphQLString },
    subdomain: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
    userId: { type: new GraphQLNonNull(GraphQLID) },
    user: {
      type: UserType,
      resolve: async (project) => {
        return await User.findById(project.userId)
      }
    },
    deployments: {
      type: new GraphQLList(DeploymentType),
      args: {
        limit: { type: GraphQLInt, defaultValue: 10 },
        status: { type: GraphQLString }
      },
      resolve: async (project, args) => {
        const query: any = { projectId: project.id }
        if (args.status) query.status = args.status
        
        return await Deployment.find(query)
          .sort({ createdAt: -1 })
          .limit(args.limit)
      }
    },
    latestDeployment: {
      type: DeploymentType,
      resolve: async (project) => {
        return await Deployment.findOne({ projectId: project.id })
          .sort({ createdAt: -1 })
      }
    },
    analytics: {
      type: ProjectAnalyticsType,
      resolve: async (project, args, context) => {
        // Check if analytics feature is available in current API version
        if (!hasFeature(context.apiVersion, 'analytics')) {
          return null
        }
        
        // Mock analytics data - replace with actual analytics service
        return {
          totalViews: Math.floor(Math.random() * 10000),
          uniqueVisitors: Math.floor(Math.random() * 5000),
          deploymentCount: await Deployment.countDocuments({ projectId: project.id }),
          averageLoadTime: Math.floor(Math.random() * 2000) + 500,
          uptime: 99.9
        }
      }
    }
  })
})

const DeploymentType = new GraphQLObjectType({
  name: 'Deployment',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    projectId: { type: new GraphQLNonNull(GraphQLID) },
    userId: { type: new GraphQLNonNull(GraphQLID) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    url: { type: GraphQLString },
    commitHash: { type: GraphQLString },
    commitMessage: { type: GraphQLString },
    branch: { type: GraphQLString },
    buildTime: { type: GraphQLInt },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
    project: {
      type: ProjectType,
      resolve: async (deployment) => {
        return await Project.findById(deployment.projectId)
      }
    },
    logs: {
      type: new GraphQLList(LogEntryType),
      args: {
        limit: { type: GraphQLInt, defaultValue: 50 }
      },
      resolve: async (deployment, args) => {
        // Mock log data - replace with actual log service
        return Array.from({ length: Math.min(args.limit, 20) }, (_, i) => ({
          id: `log_${deployment.id}_${i}`,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
          message: `Log entry ${i + 1} for deployment ${deployment.id}`,
          source: 'build'
        }))
      }
    }
  })
})

const RepositoryType = new GraphQLObjectType({
  name: 'Repository',
  fields: {
    url: { type: GraphQLString },
    branch: { type: GraphQLString },
    provider: { type: GraphQLString },
    private: { type: GraphQLBoolean }
  }
})

const UserStatsType = new GraphQLObjectType({
  name: 'UserStats',
  fields: {
    totalProjects: { type: GraphQLInt },
    totalDeployments: { type: GraphQLInt },
    activeProjects: { type: GraphQLInt },
    storageUsed: { type: GraphQLInt }
  }
})

const ProjectAnalyticsType = new GraphQLObjectType({
  name: 'ProjectAnalytics',
  fields: {
    totalViews: { type: GraphQLInt },
    uniqueVisitors: { type: GraphQLInt },
    deploymentCount: { type: GraphQLInt },
    averageLoadTime: { type: GraphQLInt },
    uptime: { type: GraphQLString }
  }
})

const LogEntryType = new GraphQLObjectType({
  name: 'LogEntry',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    timestamp: { type: new GraphQLNonNull(GraphQLString) },
    level: { type: new GraphQLNonNull(GraphQLString) },
    message: { type: new GraphQLNonNull(GraphQLString) },
    source: { type: GraphQLString }
  }
})

// Root Query Type
const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    // User queries
    me: {
      type: UserType,
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }
        return context.user
      }
    },
    user: {
      type: UserType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }
        return await User.findById(args.id)
      }
    },

    // Project queries
    projects: {
      type: new GraphQLList(ProjectType),
      args: {
        limit: { type: GraphQLInt, defaultValue: 20 },
        offset: { type: GraphQLInt, defaultValue: 0 },
        status: { type: GraphQLString },
        framework: { type: GraphQLString }
      },
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }

        const query: any = { userId: context.user.id }
        if (args.status) query.status = args.status
        if (args.framework) query.framework = args.framework

        return await Project.find(query)
          .sort({ createdAt: -1 })
          .skip(args.offset)
          .limit(args.limit)
      }
    },
    project: {
      type: ProjectType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }

        const project = await Project.findById(args.id)
        if (!project || project.userId !== context.user.id) {
          throw new Error('Project not found or access denied')
        }
        return project
      }
    },

    // Deployment queries
    deployments: {
      type: new GraphQLList(DeploymentType),
      args: {
        projectId: { type: GraphQLID },
        limit: { type: GraphQLInt, defaultValue: 20 },
        offset: { type: GraphQLInt, defaultValue: 0 },
        status: { type: GraphQLString }
      },
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }

        const query: any = { userId: context.user.id }
        if (args.projectId) query.projectId = args.projectId
        if (args.status) query.status = args.status

        return await Deployment.find(query)
          .sort({ createdAt: -1 })
          .skip(args.offset)
          .limit(args.limit)
      }
    },
    deployment: {
      type: DeploymentType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }

        const deployment = await Deployment.findById(args.id)
        if (!deployment || deployment.userId !== context.user.id) {
          throw new Error('Deployment not found or access denied')
        }
        return deployment
      }
    },

    // Analytics queries (v2+ only)
    analytics: {
      type: ProjectAnalyticsType,
      args: {
        projectId: { type: new GraphQLNonNull(GraphQLID) },
        timeRange: { type: GraphQLString, defaultValue: '7d' }
      },
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }

        if (!hasFeature(context.apiVersion, 'analytics')) {
          throw new Error('Analytics feature not available in this API version')
        }

        const project = await Project.findById(args.projectId)
        if (!project || project.userId !== context.user.id) {
          throw new Error('Project not found or access denied')
        }

        // Mock analytics data - replace with actual analytics service
        return {
          totalViews: Math.floor(Math.random() * 10000),
          uniqueVisitors: Math.floor(Math.random() * 5000),
          deploymentCount: await Deployment.countDocuments({ projectId: args.projectId }),
          averageLoadTime: Math.floor(Math.random() * 2000) + 500,
          uptime: 99.9
        }
      }
    }
  }
})

// Root Mutation Type
const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    // Project mutations
    createProject: {
      type: ProjectType,
      args: {
        input: { type: new GraphQLNonNull(ProjectInputType) }
      },
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }

        const project = new Project({
          ...args.input,
          userId: context.user.id,
          status: 'active'
        })

        return await project.save()
      }
    },
    updateProject: {
      type: ProjectType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        input: { type: new GraphQLNonNull(ProjectUpdateInputType) }
      },
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }

        const project = await Project.findById(args.id)
        if (!project || project.userId !== context.user.id) {
          throw new Error('Project not found or access denied')
        }

        Object.assign(project, args.input)
        return await project.save()
      }
    },
    deleteProject: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }

        const project = await Project.findById(args.id)
        if (!project || project.userId !== context.user.id) {
          throw new Error('Project not found or access denied')
        }

        await Project.findByIdAndDelete(args.id)
        await Deployment.deleteMany({ projectId: args.id })
        return true
      }
    },

    // Deployment mutations
    createDeployment: {
      type: DeploymentType,
      args: {
        input: { type: new GraphQLNonNull(DeploymentInputType) }
      },
      resolve: async (root, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required')
        }

        const project = await Project.findById(args.input.projectId)
        if (!project || project.userId !== context.user.id) {
          throw new Error('Project not found or access denied')
        }

        const deployment = new Deployment({
          ...args.input,
          userId: context.user.id,
          status: 'pending'
        })

        return await deployment.save()
      }
    }
  }
})

// Input Types
const ProjectInputType = new GraphQLObjectType({
  name: 'ProjectInput',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    repository: { type: RepositoryInputType },
    framework: { type: GraphQLString },
    domain: { type: GraphQLString },
    visibility: { type: GraphQLString }
  }
})

const ProjectUpdateInputType = new GraphQLObjectType({
  name: 'ProjectUpdateInput',
  fields: {
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    repository: { type: RepositoryInputType },
    framework: { type: GraphQLString },
    domain: { type: GraphQLString },
    visibility: { type: GraphQLString }
  }
})

const RepositoryInputType = new GraphQLObjectType({
  name: 'RepositoryInput',
  fields: {
    url: { type: new GraphQLNonNull(GraphQLString) },
    branch: { type: GraphQLString },
    provider: { type: GraphQLString },
    private: { type: GraphQLBoolean }
  }
})

const DeploymentInputType = new GraphQLObjectType({
  name: 'DeploymentInput',
  fields: {
    projectId: { type: new GraphQLNonNull(GraphQLID) },
    commitHash: { type: GraphQLString },
    commitMessage: { type: GraphQLString },
    branch: { type: GraphQLString }
  }
})

// GraphQL Context
interface GraphQLContext {
  user?: any
  apiVersion: ApiVersion
  request: any
  reply: any
}

// Register GraphQL
export async function registerGraphQL(fastify: FastifyInstance) {
  await fastify.register(mercurius, {
    schema: buildSchema(`
      type Query {
        hello: String
      }
    `),
    graphiql: true,
    context: async (request, reply): Promise<GraphQLContext> => {
      return {
        user: (request as any).user,
        apiVersion: (request as any).apiVersion || 'v2',
        request,
        reply
      }
    },
    resolvers: {
      Query: QueryType.getFields(),
      Mutation: MutationType.getFields()
    }
  })

  // GraphQL Playground route (development only)
  if (process.env.NODE_ENV === 'development') {
    fastify.get('/graphql/playground', async (request, reply) => {
      const playgroundHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GraphQL Playground</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css">
</head>
<body>
  <div id="root">
    <style>
      body { margin: 0; font-family: Open Sans, sans-serif; }
      #root { height: 100vh; }
    </style>
  </div>
  <script>window.addEventListener('load', function (event) {
    GraphQLPlayground.init(document.getElementById('root'), {
      endpoint: '/graphql'
    })
  })</script>
  <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
</body>
</html>`
      
      reply.type('text/html').send(playgroundHtml)
    })
  }

  console.log('🔗 GraphQL configured with playground')
}