# Docker Code Execution Setup

## Overview
This document explains how to set up Docker-based code execution for the interview platform.

## Architecture
1. **Frontend** (Next.js) - User writes code in Monaco Editor
2. **API Route** (`/api/execute`) - Receives code and manages Docker execution
3. **Docker Container** - Runs user code in isolated environment
4. **Terminal** (xterm.js) - Displays execution results

## Installation

### 1. Install Docker
- **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **macOS**: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

### 2. Install Docker SDK

For Node.js backend:
```bash
npm install dockerode
```

For Python backend (FastAPI/Flask):
```bash
pip install docker
```

## Implementation Guide

### Option A: Node.js with dockerode

1. Install dependencies:
```bash
cd apps/harp-web
npm install dockerode @types/dockerode
```

2. Update `/api/execute/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import Docker from 'dockerode';

const docker = new Docker();

export async function POST(request: NextRequest) {
  try {
    const { code, language = 'python', testCases } = await request.json();

    // Create container
    const container = await docker.createContainer({
      Image: 'python:3.11-slim',
      Cmd: ['python', '-c', code],
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Memory: 512 * 1024 * 1024, // 512MB limit
        CpuPeriod: 100000,
        CpuQuota: 50000, // 50% CPU
        NetworkMode: 'none', // No network access
      },
    });

    // Start container
    await container.start();

    // Capture output
    const stream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
    });

    let stdout = '';
    let stderr = '';

    stream.on('data', (chunk) => {
      const str = chunk.toString('utf8');
      // Docker logs are prefixed with header bytes
      const data = str.slice(8);
      if (chunk[0] === 1) stdout += data;
      if (chunk[0] === 2) stderr += data;
    });

    // Wait for completion (with timeout)
    await Promise.race([
      container.wait(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), 10000)
      ),
    ]);

    // Cleanup
    await container.remove();

    // Validate output against test cases
    const passed = testCases 
      ? testCases.every(tc => stdout.includes(tc.expected))
      : true;

    return NextResponse.json({
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      passed,
    });
  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Option B: Separate Backend Server (Recommended for Production)

Create a separate backend service (e.g., Express.js or FastAPI):

**FastAPI Example** (`backend/main.py`):
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import docker
from pydantic import BaseModel
import asyncio

app = FastAPI()

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = docker.from_env()

class CodeRequest(BaseModel):
    code: str
    language: str = "python"
    test_cases: list = []

@app.post("/execute")
async def execute_code(request: CodeRequest):
    try:
        # Pull Python image if not exists
        try:
            client.images.get("python:3.11-slim")
        except docker.errors.ImageNotFound:
            client.images.pull("python:3.11-slim")
        
        # Run code in container
        container = client.containers.run(
            "python:3.11-slim",
            f"python -c '{request.code}'",
            detach=True,
            mem_limit="512m",
            cpu_period=100000,
            cpu_quota=50000,
            network_mode="none",
            remove=True,
        )
        
        # Wait for completion with timeout
        try:
            result = container.wait(timeout=10)
            logs = container.logs(stdout=True, stderr=True)
            stdout = logs.decode('utf-8')
            stderr = ""
            
            # Validate against test cases
            passed = all(
                tc['expected'] in stdout 
                for tc in request.test_cases
            ) if request.test_cases else True
            
            return {
                "success": True,
                "stdout": stdout,
                "stderr": stderr,
                "passed": passed
            }
        except Exception as e:
            container.stop()
            raise HTTPException(status_code=500, detail="Execution timeout")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

Then update the frontend API call to point to your backend:
```typescript
const response = await fetch('http://localhost:8000/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, test_cases: expectedResults }),
});
```

## Security Considerations

⚠️ **CRITICAL**: Never run untrusted code without proper sandboxing!

### Required Security Measures:
1. **Resource Limits**:
   - Memory limit (512MB recommended)
   - CPU quota (50% max)
   - Execution timeout (10 seconds)
   
2. **Network Isolation**:
   ```javascript
   NetworkMode: 'none'
   ```

3. **Filesystem Restrictions**:
   - Use read-only filesystem where possible
   - No volume mounts from host
   
4. **Image Security**:
   - Use official, minimal images (e.g., `python:3.11-slim`)
   - Keep images updated
   - Scan for vulnerabilities

5. **Additional Hardening**:
   - Run container as non-root user
   - Use seccomp profiles
   - Enable AppArmor/SELinux

## Testing

### 1. Pull Python image:
```bash
docker pull python:3.11-slim
```

### 2. Test execution manually:
```bash
docker run --rm python:3.11-slim python -c "print('Hello, World!')"
```

### 3. Test with your API:
```bash
curl -X POST http://localhost:4200/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello from Docker!\")"}'
```

## Test Cases Structure

Example test case format:
```typescript
interface TestCase {
  input: any;
  expected: string;
  description: string;
}

const testCases: TestCase[] = [
  {
    input: { nums: [2, 7, 11, 15], target: 9 },
    expected: "[0, 1]",
    description: "Basic two sum case"
  },
  // More test cases...
];
```

## Supported Languages

To add more languages, modify the Docker image selection:

```typescript
const imageMap = {
  python: 'python:3.11-slim',
  javascript: 'node:20-alpine',
  java: 'openjdk:17-slim',
  rust: 'rust:1.70-slim',
  go: 'golang:1.21-alpine',
};
```

## Troubleshooting

### Docker daemon not running
```bash
# Start Docker Desktop (Windows/Mac)
# Or start Docker daemon (Linux):
sudo systemctl start docker
```

### Permission denied
```bash
# Add user to docker group (Linux):
sudo usermod -aG docker $USER
```

### Container doesn't stop
```bash
# Force remove all containers:
docker rm -f $(docker ps -aq)
```

## Next Steps

1. ✅ Install Docker
2. ✅ Choose implementation approach (Option A or B)
3. ✅ Implement execution logic
4. ✅ Add test case validation
5. ✅ Add security measures
6. ✅ Test thoroughly
7. ✅ Deploy to production

## Resources

- [dockerode documentation](https://github.com/apocas/dockerode)
- [Docker SDK for Python](https://docker-py.readthedocs.io/)
- [Docker security best practices](https://docs.docker.com/engine/security/)
- [xterm.js documentation](https://xtermjs.org/)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
