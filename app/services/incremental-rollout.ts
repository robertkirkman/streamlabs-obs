import { Inject } from 'services/core/injector';
import { authorizedHeaders, jfetch } from 'util/requests';
import { mutation, StatefulService, ViewHandler } from 'services/core/stateful-service';
import { UserService } from 'services/user';
import { HostsService } from './hosts';
import Utils from 'services/utils';
import { InitAfter } from './core';
import { AppService } from './app';

export enum EAvailableFeatures {
  platform = 'slobs--platform',
  creatorSites = 'slobs--creator-sites',
  facebookOnboarding = 'slobs--facebook-onboarding',
  twitter = 'slobs--twitter',
  restream = 'slobs--restream',
  reactGoLive = 'slobs--react-golive',
  tiktok = 'slobs--tiktok',
  growTab = 'slobs--grow-tab',
}

interface IIncrementalRolloutServiceState {
  availableFeatures: string[];
}

@InitAfter('UserService')
export class IncrementalRolloutService extends StatefulService<IIncrementalRolloutServiceState> {
  @Inject() private userService: UserService;
  @Inject() private hostsService: HostsService;
  @Inject() private appService: AppService;

  static initialState: IIncrementalRolloutServiceState = {
    availableFeatures: [],
  };

  init() {
    this.setCommandLineFeatures();

    this.userService.userLogin.subscribe(() => this.fetchAvailableFeatures());
    this.userService.userLogout.subscribe(() => this.resetAvailableFeatures());
  }

  get views() {
    return new IncrementalRolloutView(this.state);
  }

  @mutation()
  private SET_AVAILABLE_FEATURES(features: string[]) {
    this.state.availableFeatures = features;
  }

  fetchAvailableFeatures() {
    if (this.userService.isLoggedIn) {
      const host = this.hostsService.streamlabs;
      const url = `https://${host}/api/v5/slobs/available-features`;
      const headers = authorizedHeaders(this.userService.apiToken);
      const request = new Request(url, { headers });

      return jfetch<{ features: string[] }>(request).then(response => {
        this.SET_AVAILABLE_FEATURES([...this.state.availableFeatures, ...response.features]);
      });
    }
  }

  setCommandLineFeatures() {
    this.appService.state.argv.forEach(arg => {
      const match = arg.match(/^\-\-feature-enable\-([a-zA-Z\-]*)$/);

      if (match) {
        this.SET_AVAILABLE_FEATURES([...this.state.availableFeatures, match[1]]);
      }
    });
  }

  resetAvailableFeatures() {
    this.SET_AVAILABLE_FEATURES([]);

    // Command line features are always available
    this.setCommandLineFeatures();
  }
}

class IncrementalRolloutView extends ViewHandler<IIncrementalRolloutServiceState> {
  get availableFeatures() {
    return this.state.availableFeatures || [];
  }

  featureIsEnabled(feature: EAvailableFeatures): boolean {
    if (Utils.isDevMode()) return true; // always show for dev mode

    return this.availableFeatures.indexOf(feature) > -1;
  }
}
