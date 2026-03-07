# Security Setup Guide

## 🚨 CRITICAL: API Key Security

Your Gemini API key was leaked and has been revoked. Follow these steps immediately:

### 1. Generate New API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. **Never commit this key to git**

### 2. Configure Environment Variables

Create a `.env` file in the project root:
```bash
# Replace with your NEW API key
GEMINI_API_KEY=your_new_gemini_api_key_here

# Optional: Firebase configuration
FIREBASE_PROJECT_ID=eduvault-mvp
FIREBASE_CREDENTIALS_PATH=
```

### 3. Update Application Configuration

The application now uses environment variables instead of hardcoded keys:

**Before (INSECURE):**
```yaml
app:
  gemini:
    api-key: REDACTED  # ❌ LEAKED
```

**After (SECURE):**
```yaml
app:
  gemini:
    api-key: ${GEMINI_API_KEY:}  # ✅ Uses environment variable
```

## 🔧 Fixes Applied

### 1. API Key Security
- ✅ Removed hardcoded API keys from all source files
- ✅ Added proper environment variable configuration
- ✅ Added `.gitignore` to prevent future leaks
- ✅ Fail-fast errors when API key is missing

### 2. Rate Limiting & Retry Logic
- ✅ Added exponential backoff (1s → 2s → 4s)
- ✅ Retry for 429 (rate limit) and 5xx errors
- ✅ Fail-fast for 403 (API key revoked) errors
- ✅ Limited concurrent API calls to prevent quota exhaustion

### 3. Async Concurrency Control
- ✅ Limited Gemini API calls: 2 core, 4 max threads
- ✅ Limited RAG embeddings: 1 core, 2 max threads
- ✅ Queue capacity limits to prevent memory issues
- ✅ Proper rejection handling for overloaded tasks

### 4. Error Reporting Improvements
- ✅ Track success/failed embedding counts
- ✅ Detailed error logging with context
- ✅ No more misleading "success" when embeddings fail

### 5. Font Cache Optimization
- ✅ Enabled PDFBox font caching
- ✅ Reduced font-related log noise
- ✅ Faster startup times

### 6. Attendance Data Validation
- ✅ Detect suspicious parsing results
- ✅ Validate logical constraints (attended ≤ conducted)
- ✅ Better error messages for empty results

## 🚀 Production Deployment

### Environment Variables (Production)
```bash
# Required
GEMINI_API_KEY=your_production_api_key

# Optional
APP_STORAGE_LOCAL_DIR=/app/data/files
FIREBASE_PROJECT_ID=your_project_id
```

### Docker Deployment
```dockerfile
# Copy .env file (never commit it)
COPY .env /app/.env

# Font cache optimization
RUN fc-cache -f -v
```

### Railway/Vercel
Set environment variables in the dashboard:
- `GEMINI_API_KEY`
- `FIREBASE_PROJECT_ID` (if using Firebase)

## 📊 Monitoring

Watch for these log messages:
- `CRITICAL: API key appears to be revoked/leaked` → Generate new key
- `Retrying in X ms...` → Rate limiting active
- `Suspicious attendance data` → Check scraper logic
- `Completed RAG ingestion. Success: X, Failed: Y` → Monitor embedding health

## 🔄 Next Steps

1. **Immediate**: Generate new API key and update `.env`
2. **Upgrade**: Consider paid Gemini tier for production
3. **Monitor**: Set up alerts for 403/429 errors
4. **Test**: Verify all AI features work with new key

## ⚠️ Security Reminders

- **NEVER** commit API keys to version control
- **ALWAYS** use environment variables for secrets
- **ROTATE** keys regularly in production
- **MONITOR** API usage and quotas
- **USE** different keys for dev/staging/prod

The `.gitignore` file now prevents accidental commits of sensitive files.
