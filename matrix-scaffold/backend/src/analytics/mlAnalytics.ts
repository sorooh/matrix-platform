/**
 * Phase 8.6 - Advanced Analytics with Machine Learning
 * 
 * ML-powered analytics
 * - Machine learning insights
 * - Predictive analytics
 * - Anomaly detection
 * - Custom dashboards
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type MLModelType = 'forecast' | 'anomaly' | 'classification' | 'clustering'
export type AnomalyType = 'spike' | 'drop' | 'outlier' | 'pattern_change'

export interface MLInsight {
  id: string
  type: MLModelType
  metric: string
  prediction: number
  confidence: number // 0-100
  factors: string[]
  createdAt: Date
}

export interface AnomalyDetection {
  id: string
  metric: string
  type: AnomalyType
  value: number
  expectedValue: number
  deviation: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  detectedAt: Date
}

export interface PredictiveForecast {
  id: string
  metric: string
  predictions: ForecastPoint[]
  confidence: number
  generatedAt: Date
}

export interface ForecastPoint {
  date: Date
  value: number
  lowerBound: number
  upperBound: number
}

class MLAnalytics {
  private insights: Map<string, MLInsight[]> = new Map()
  private anomalies: Map<string, AnomalyDetection[]> = new Map()
  private forecasts: Map<string, PredictiveForecast> = new Map()

  async initialize() {
    logInfo('Initializing ML Analytics...')
    logInfo('✅ ML Analytics initialized')
  }

  // Generate ML insight
  async generateInsight(
    type: MLModelType,
    metric: string,
    historicalData: number[]
  ): Promise<MLInsight> {
    try {
      const insightId = nanoid()
      const now = new Date()

      // Simple prediction (in production, use actual ML model)
      const prediction = this.simpleForecast(historicalData)
      const confidence = this.calculateConfidence(historicalData)
      const factors = this.identifyFactors(historicalData)

      const insight: MLInsight = {
        id: insightId,
        type,
        metric,
        prediction,
        confidence,
        factors,
        createdAt: now
      }

      const insights = this.insights.get(metric) || []
      insights.push(insight)
      this.insights.set(metric, insights)

      logInfo(`✅ Generated ML insight ${insightId} for ${metric}`)

      return insight
    } catch (error) {
      logError(error as Error, { context: 'Generate ML insight' })
      throw error
    }
  }

  // Detect anomaly
  async detectAnomaly(
    metric: string,
    currentValue: number,
    historicalData: number[]
  ): Promise<AnomalyDetection | null> {
    try {
      const mean = historicalData.reduce((a, b) => a + b, 0) / historicalData.length
      const variance = historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalData.length
      const stdDev = Math.sqrt(variance)
      const zScore = Math.abs((currentValue - mean) / stdDev)

      if (zScore < 2) return null // Not an anomaly

      const anomalyId = nanoid()
      const now = new Date()

      let type: AnomalyType = 'outlier'
      if (currentValue > mean + 2 * stdDev) {
        type = 'spike'
      } else if (currentValue < mean - 2 * stdDev) {
        type = 'drop'
      }

      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      if (zScore >= 4) severity = 'critical'
      else if (zScore >= 3) severity = 'high'
      else if (zScore >= 2) severity = 'medium'

      const anomaly: AnomalyDetection = {
        id: anomalyId,
        metric,
        type,
        value: currentValue,
        expectedValue: mean,
        deviation: zScore,
        severity,
        detectedAt: now
      }

      const anomalies = this.anomalies.get(metric) || []
      anomalies.push(anomaly)
      this.anomalies.set(metric, anomalies)

      logInfo(`⚠️ Anomaly detected: ${metric} - ${type} (severity: ${severity})`)

      return anomaly
    } catch (error) {
      logError(error as Error, { context: 'Detect anomaly' })
      return null
    }
  }

  // Generate forecast
  async generateForecast(
    metric: string,
    historicalData: number[],
    periods: number = 30
  ): Promise<PredictiveForecast> {
    try {
      const forecastId = nanoid()
      const now = new Date()

      const predictions: ForecastPoint[] = []
      const lastValue = historicalData[historicalData.length - 1]
      const trend = this.calculateTrend(historicalData)
      const confidence = this.calculateConfidence(historicalData)

      for (let i = 1; i <= periods; i++) {
        const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
        const predictedValue = lastValue + trend * i
        const stdDev = this.calculateStdDev(historicalData)
        const lowerBound = predictedValue - 1.96 * stdDev // 95% confidence interval
        const upperBound = predictedValue + 1.96 * stdDev

        predictions.push({
          date,
          value: predictedValue,
          lowerBound,
          upperBound
        })
      }

      const forecast: PredictiveForecast = {
        id: forecastId,
        metric,
        predictions,
        confidence,
        generatedAt: now
      }

      this.forecasts.set(metric, forecast)
      logInfo(`✅ Generated forecast ${forecastId} for ${metric}`)

      return forecast
    } catch (error) {
      logError(error as Error, { context: 'Generate forecast' })
      throw error
    }
  }

  // Simple forecast
  private simpleForecast(data: number[]): number {
    if (data.length < 2) return data[0] || 0

    const trend = this.calculateTrend(data)
    const lastValue = data[data.length - 1]
    return lastValue + trend
  }

  // Calculate trend
  private calculateTrend(data: number[]): number {
    if (data.length < 2) return 0

    const n = data.length
    const sumX = (n * (n - 1)) / 2
    const sumY = data.reduce((a, b) => a + b, 0)
    const sumXY = data.reduce((sum, val, idx) => sum + idx * val, 0)
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    return slope
  }

  // Calculate confidence
  private calculateConfidence(data: number[]): number {
    if (data.length < 3) return 50
    if (data.length < 10) return 70
    if (data.length < 30) return 85
    return 95
  }

  // Calculate standard deviation
  private calculateStdDev(data: number[]): number {
    if (data.length < 2) return 0

    const mean = data.reduce((a, b) => a + b, 0) / data.length
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
    return Math.sqrt(variance)
  }

  // Identify factors
  private identifyFactors(data: number[]): string[] {
    const factors: string[] = []

    if (data.length >= 7) {
      const weeklyTrend = this.calculateTrend(data.slice(-7))
      if (Math.abs(weeklyTrend) > 0.1) {
        factors.push(weeklyTrend > 0 ? 'upward_trend' : 'downward_trend')
      }
    }

    if (data.length >= 30) {
      const monthlyTrend = this.calculateTrend(data.slice(-30))
      if (Math.abs(monthlyTrend) > 0.05) {
        factors.push(monthlyTrend > 0 ? 'monthly_growth' : 'monthly_decline')
      }
    }

    const volatility = this.calculateStdDev(data)
    if (volatility > data[data.length - 1] * 0.2) {
      factors.push('high_volatility')
    }

    return factors
  }

  // Get insights
  async getInsights(metric: string, limit: number = 10): Promise<MLInsight[]> {
    const insights = this.insights.get(metric) || []
    return insights.slice(-limit)
  }

  // Get anomalies
  async getAnomalies(metric: string, limit: number = 10): Promise<AnomalyDetection[]> {
    const anomalies = this.anomalies.get(metric) || []
    return anomalies.slice(-limit)
  }

  // Get forecast
  async getForecast(metric: string): Promise<PredictiveForecast | null> {
    return this.forecasts.get(metric) || null
  }
}

export const mlAnalytics = new MLAnalytics()

