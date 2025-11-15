import express from 'express';
import cors from 'cors';
import Docker from 'dockerode';

const app = express();
const docker = new Docker();
const port = 3002;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'running' });
});

app.post('/execute', async (req, res): Promise<any> => {
  console.log('Executing code...');
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const container = await docker.createContainer({
      Image: 'python:3.11-slim',
      Cmd: ['python', '-c', code],
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        AutoRemove: true,
        Memory: 512 * 1024 * 1024,
        NetworkMode: 'none',
      },
    });

    await container.start();

    const stream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
    });

    let stdout = '';
    let stderr = '';

    stream.on('data', (chunk) => {
      const header = chunk[0];
      const data = chunk.slice(8).toString();
      if (header === 1) stdout += data;
      else if (header === 2) stderr += data;
    });

    await container.wait();

    console.log('stdout:', stdout);
    console.log('stderr:', stderr);

    res.json({
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend: http://localhost:${port}`);
  docker.ping()
    .then(() => console.log('Docker connected'))
    .catch(() => console.log('Docker not connected'));
});
