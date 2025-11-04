# AWS IAM policy for Snapshot Worker

This file contains a minimal IAM policy you can apply to an IAM user/role used by the snapshot worker to upload and serve snapshot artifacts to S3.

Place the policy JSON found at `matrix-scaffold/infra/snapshot-iam-policy.json` into the IAM console (or use the AWS CLI) and replace `YOUR_BUCKET_NAME` with the target bucket name.

Recommended permissions (minimal)

- s3:PutObject — allow worker to upload snapshot files.
- s3:GetObject — allow reading artifacts (for tests or signed URL generation).
- s3:ListBucket — optional, useful for debugging / listing snapshots.

Example quick-steps (console)

1. Open AWS Console → IAM → Policies → Create policy → JSON.
2. Paste the contents of `matrix-scaffold/infra/snapshot-iam-policy.json` and replace `YOUR_BUCKET_NAME`.
3. Create policy, then create an IAM user or role and attach this policy.
4. Create programmatic access keys for the IAM user and add them to your CI secrets:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION (optional; default region will be used by the SDK)

CI notes

- In GitHub Actions set the above secrets in the repository settings (Settings → Secrets and variables → Actions → New repository secret).
- Set `SNAPSHOT_S3_BUCKET` in the workflow or repository secrets to point at the bucket name.

Security notes

- Scope down the bucket and prefix to `snapshots/*` to avoid granting broader access.
- Rotate credentials periodically and use short-lived credentials if possible (STS assumed roles).
