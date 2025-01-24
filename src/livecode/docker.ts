import Docker from 'dockerode';
import { Stream } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface ContainerOptions {
  Image: string;
  Cmd: string[];
  User: string;
  Env: string[];
  HostConfig: {
    NetworkMode: string;
    Binds: string[];
  };
}

interface WaitResponse {
  StatusCode: number;
}

export class DockerManager {
  private docker: Docker;
  private baseImage = 'namin/io.livecode.ch';
  private imagePrefix = 'temp/io.livecode.ch';
  
  constructor() {
    this.docker = new Docker();
  }

  async buildImage(user: string, repo: string): Promise<void> {
    const image = this.getImageName(user, repo);
    const gitUrl = `https://github.com/${user}/${repo}.git`;
    
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docker-build-'));
    const dockerfilePath = path.join(tmpDir, 'Dockerfile');
    
    try {
      // Write Dockerfile
      fs.writeFileSync(dockerfilePath, [
        `FROM ${this.baseImage}`,
        'USER runner',
        `RUN git clone ${gitUrl} /home/runner/code`,
        'WORKDIR /home/runner/code',
        'RUN livecode-install'
      ].join('\n'));

      // Build image
      const stream = await this.docker.buildImage({
        context: tmpDir,
        src: ['Dockerfile']
      }, {
        t: image,
        forcerm: true
      });

      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err: Error | null, res: any[]) => 
          err ? reject(err) : resolve(res)
        );
      });
      
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  async ensureImage(user: string, repo: string): Promise<void> {
    const image = this.getImageName(user, repo);
    
    try {
      await this.inspectImage(image);
    } catch (error) {
      await this.buildImage(user, repo);
    }
  }

  private async inspectImage(image: string): Promise<Docker.ImageInspectInfo> {
    return await this.docker.getImage(image).inspect();
  }

  async runContainer(image: string, cmd: string, timeout = 500): Promise<{status: number; output: string}> {
    const options: ContainerOptions = {
      Image: image,
      Cmd: ['timeout', timeout.toString(), ...cmd.split(' ')],
      User: 'runner',
      Env: ['HOME=/home/runner'],
      HostConfig: {
        NetworkMode: 'none',
        Binds: ['/tmp/snippets:/mnt/snippets:ro']
      }
    };

    const container = await this.docker.createContainer(options);
    await container.start();
    const waitResponse: WaitResponse = await container.wait();
    const logs = await container.logs({ stdout: true, stderr: true });
    await container.remove();
    
    return {
      status: waitResponse.StatusCode,
      output: logs.toString()
    };
  }

  getImageName(user: string, repo: string, suffix = ''): string {
    if (suffix) suffix = '/' + suffix;
    return `${this.imagePrefix}/github.com/${user}/${repo}${suffix}`.toLowerCase();
  }
}
