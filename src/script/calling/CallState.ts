/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {QualifiedId} from '@wireapp/api-client/lib/user';
import ko from 'knockout';
import {singleton} from 'tsyringe';

import {REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';

import {matchQualifiedIds} from 'Util/QualifiedId';

import {Call} from './Call';

import {Config} from '../Config';
import type {ElectronDesktopCapturerSource} from '../media/MediaDevicesHandler';
import {CallViewTab} from '../view_model/CallingViewModel';

export enum MuteState {
  NOT_MUTED,
  SELF_MUTED,
  REMOTE_MUTED,
  REMOTE_FORCE_MUTED,
}

export enum CallingViewMode {
  FULL_SCREEN_GRID = 'full-screen-grid',
  MINIMIZED = 'minimized',
  DETACHED_WINDOW = 'detached-window',
}

type Emoji = {emoji: string; id: string; left: number; from: string};

@singleton()
export class CallState {
  public readonly calls: ko.ObservableArray<Call> = ko.observableArray();
  public readonly emojis: ko.ObservableArray<Emoji> = ko.observableArray<Emoji>([]);
  /** List of calls that can be joined by the user */
  public readonly joinableCalls: ko.PureComputed<Call[]>;
  public readonly acceptedVersionWarnings = ko.observableArray<QualifiedId>();
  public readonly cbrEncoding = ko.observable(Config.getConfig().FEATURE.ENFORCE_CONSTANT_BITRATE ? 1 : 0);
  readonly selectableScreens = ko.observable<ElectronDesktopCapturerSource[]>([]);
  readonly selectableWindows = ko.observable<ElectronDesktopCapturerSource[]>([]);
  /** call that is current active (connecting or connected) */
  public readonly activeCalls: ko.PureComputed<Call[]>;
  public readonly joinedCall: ko.PureComputed<Call | undefined>;
  public readonly activeCallViewTab = ko.observable(CallViewTab.ALL);
  readonly isChoosingScreen: ko.PureComputed<boolean>;
  readonly isSpeakersViewActive: ko.PureComputed<boolean>;
  public readonly viewMode = ko.observable<CallingViewMode>(CallingViewMode.MINIMIZED);

  constructor() {
    this.joinedCall = ko.pureComputed(() => this.calls().find(call => call.state() === CALL_STATE.MEDIA_ESTAB));
    this.activeCalls = ko.pureComputed(() => this.calls().filter(call => !call.reason()));
    this.joinableCalls = ko.pureComputed(() =>
      this.calls().filter(
        call => call.state() === CALL_STATE.INCOMING && call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE,
      ),
    );
    this.isChoosingScreen = ko.pureComputed(
      () => this.selectableScreens().length > 0 || this.selectableWindows().length > 0,
    );

    this.calls.subscribe(activeCalls => {
      const activeCallIds = activeCalls.map(call => call.conversation.qualifiedId);
      this.acceptedVersionWarnings.remove(
        acceptedId => !activeCallIds.some(callId => matchQualifiedIds(acceptedId, callId)),
      );
    });
    this.isSpeakersViewActive = ko.pureComputed(() => this.activeCallViewTab() === CallViewTab.SPEAKERS);

    this.isChoosingScreen = ko.pureComputed(
      () => this.selectableScreens().length > 0 || this.selectableWindows().length > 0,
    );
  }
}
