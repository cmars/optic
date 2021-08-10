import { Command, flags } from '@oclif/command';
import { ensureDaemonStarted } from '@useoptic/cli-server';
import { ingestS3 } from '@useoptic/cli-shared/build/captures/avro/file-system/ingest-s3-capture-saver';
import { LiveTrafficIngestedWithLocalCli } from '@useoptic/analytics';
import { lockFilePath } from '../../shared/paths';
import { Config } from '../../config';
import { cleanupAndExit, makeUiBaseUrl } from '@useoptic/cli-shared';
import { getPathsRelativeToConfig, readApiConfig } from '@useoptic/cli-config';
import { Client } from '@useoptic/cli-client';
import { trackUserEvent } from '../../shared/analytics';
import openBrowser from 'react-dev-utils/openBrowser';
import { linkToCapture } from '../../shared/ui-links';
import { v4 as uuidv4 } from 'uuid';
import Path from 'path';

export default class IngestS3 extends Command {
  static description = 'Ingest from S3';
  static hidden: boolean = true;

  static flags = {
    bucketName: flags.string({ required: true, char: 'b' }),
    region: flags.string({ char: 'r' }),
    captureId: flags.string({ char: 'c', required: false }),
    pathPrefix: flags.string({ required: false, default: '' }),
    endpointOverride: flags.string({ required: false }),
  };

  async run() {
    try {
      const parameters = this.parse(IngestS3);
      let {
        bucketName,
        region,
        captureId,
        pathPrefix,
        endpointOverride,
      } = parameters.flags;
      if (!captureId) {
        captureId = uuidv4();
      } else {
        pathPrefix = `${Path.join(pathPrefix ?? '', captureId ?? '')}`;
      }

      let interactionCount = await ingestS3({
        bucketName,
        region,
        captureId,
        pathPrefix,
        endpointOverride,
      });

      const daemonState = await ensureDaemonStarted(
        lockFilePath,
        Config.apiBaseUrl
      );

      const apiBaseUrl = `http://localhost:${daemonState.port}/api`;
      const paths = await getPathsRelativeToConfig();
      const cliClient = new Client(apiBaseUrl);
      const cliSession = await cliClient.findSession(paths.cwd, null, null);
      const uiBaseUrl = makeUiBaseUrl(daemonState);
      openBrowser(linkToCapture(uiBaseUrl, cliSession.session.id, captureId));

      const apiCfg = await readApiConfig(paths.configPath);

      /*
        captureId: Joi.string().required(),
        interactionCount: Joi.number().required()
      */
      await trackUserEvent(
        apiCfg.name,
        LiveTrafficIngestedWithLocalCli({
          captureId,
          interactionCount,
        })
      );

      cleanupAndExit();
    } catch (e) {
      this.error(e);
    }
  }
}
