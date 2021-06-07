import { Command } from '@oclif/command';
import { getPathsRelativeToConfig, readApiConfig } from '@useoptic/cli-config';
import { getCaptureId } from '../../shared/git/git-context-capture';
import { ensureDaemonStarted } from '@useoptic/cli-server';
import { lockFilePath } from '../../shared/paths';
import Config from '../../config';
import { developerDebugLogger } from '@useoptic/cli-shared';
import { Client, SpecServiceClient } from '@useoptic/cli-client';
import EventEmitter from 'events';
export default class IngestUrl extends Command {
  static description =
    'get a local upload url for capturing traffic from SDKs or HTTP';
  static hidden: boolean = true;
  static flags = {};

  async run() {
    const paths = await getPathsRelativeToConfig();
    const config = await readApiConfig(paths.configPath);
    const captureId = await getCaptureId(paths);
    /* definitely do this is another promise */
    const daemonState = await ensureDaemonStarted(
      lockFilePath,
      Config.apiBaseUrl
    );
    const apiBaseUrl = `http://localhost:${daemonState.port}/api`;
    developerDebugLogger(`api base url: ${apiBaseUrl}`);
    const cliClient = new Client(apiBaseUrl);
    const cliSession = await cliClient.findSession(paths.cwd, null, null);
    const eventEmitter = new EventEmitter();

    const ingestUrl = `ingestUrl: ${apiBaseUrl}/specs/${cliSession.session.id}/captures/${captureId}/interactions`;
    this.log(ingestUrl);
    process.exit(0);
  }
}
