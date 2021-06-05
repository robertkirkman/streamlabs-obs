import React, { useEffect } from 'react';
import cx from 'classnames';
import { useVuex } from '../hooks';
import { Services } from '../service-provider';
import { byOS, OS } from '../../util/operating-systems';
import { $t } from '../../services/i18n';
import { ipcRenderer, remote } from 'electron';
import Utils from '../../services/utils';
import KevinSvg from './KevinSvg';
import styles from './TitleBar.m.less';

export default function TitleBar(props: { windowId: string }) {
  const { CustomizationService, StreamingService, WindowsService } = Services;

  const isMaximizable = remote.getCurrentWindow().isMaximizable() !== false;
  const isMac = byOS({ [OS.Windows]: false, [OS.Mac]: true });
  const v = useVuex(
    () => ({
      theme: CustomizationService.views.currentTheme,
      title: WindowsService.state[props.windowId]?.title,
    }),
    false,
  );

  const primeTheme = /prime/.test(v.theme);
  let errorState = false;

  useEffect(lifecycle, []);

  function lifecycle() {
    if (Utils.isDevMode()) {
      ipcRenderer.on('unhandledErrorState', () => (errorState = true));
    }
  }

  function minimize() {
    remote.getCurrentWindow().minimize();
  }

  function maximize() {
    const win = remote.getCurrentWindow();

    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }

  function close() {
    if (Utils.isMainWindow() && StreamingService.isStreaming) {
      if (!confirm($t('Are you sure you want to exit while live?'))) return;
    }

    remote.getCurrentWindow().close();
  }

  return (
    <div
      className={cx(styles.titlebar, v.theme, {
        [styles['titlebar-mac']]: isMac,
        [styles.titlebarError]: errorState,
      })}
    >
      {!primeTheme && !isMac && (
        <img className={styles.titlebarIcon} src={require('../../../media/images/icon.ico')} />
      )}
      {primeTheme && !isMac && <KevinSvg className={styles.titlebarIcon} />}
      <div className={styles.titlebarTitle} onDoubleClick={maximize}>
        {v.title}
      </div>
      {!isMac && (
        <div className={styles.titlebarActions}>
          <i className={cx('icon-subtract', styles.titlebarAction)} onClick={minimize} />
          {isMaximizable && (
            <i className={cx('icon-expand-1', styles.titlebarAction)} onClick={maximize} />
          )}
          <i className={cx('icon-close', styles.titlebarAction)} onClick={close} />
        </div>
      )}
    </div>
  );
}
