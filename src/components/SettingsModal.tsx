import styles from './SettingsModal.module.css'

import { useState } from 'react'
import { Modal } from './Modal'
import { Icon } from './Icon'
import type { NotificationPermissionState } from '../lib/notifications'

type Theme = 'light' | 'dark'

export function SettingsModal({
  open,
  onClose,
  theme,
  onToggleTheme,
  soundEnabled,
  soundVolume,
  onToggleSound,
  onSetSoundVolume,
  notificationPermission,
  onEnableNotifications,
  onResetStorage,
}: {
  open: boolean
  onClose: () => void
  theme: Theme
  onToggleTheme: () => void
  soundEnabled: boolean
  soundVolume: number
  onToggleSound: () => void
  onSetSoundVolume: (volume: number) => void
  notificationPermission: NotificationPermissionState
  onEnableNotifications: () => void
  onResetStorage: () => void
}) {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  return (
    <>
      <Modal
        open={open}
        title="Settings"
        onClose={onClose}
        footer={
          <button type="button" className={styles.action} onClick={onClose}>
            Close
          </button>
        }
      >
        <div className={styles.content}>
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Controls</p>

            <div className={styles.row}>
              <div className={styles.rowLeft}>
                <Icon className={styles.rowIcon} name={theme === 'dark' ? 'moon' : 'sun'} />
                <div className={styles.rowText}>
                  <div className={styles.rowLabel}>Theme</div>
                  <div className={styles.rowHint}>
                    Currently <span className={styles.muted}>{theme}</span>
                  </div>
                </div>
              </div>
              <button type="button" className={styles.action} onClick={onToggleTheme}>
                {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
              </button>
            </div>

            <div className={styles.row}>
              <div className={styles.rowLeft}>
                <Icon className={styles.rowIcon} name="bell" />
                <div className={styles.rowText}>
                  <div className={styles.rowLabel}>Notifications</div>
                  <div className={styles.rowHint}>
                    Status <span className={styles.muted}>{notificationPermission}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={styles.action}
                onClick={onEnableNotifications}
                disabled={notificationPermission === 'granted'}
              >
                {notificationPermission === 'granted' ? 'Enabled' : 'Enable'}
              </button>
            </div>

            <div className={styles.row}>
              <div className={styles.rowLeft}>
                <Icon className={styles.rowIcon} name="pokeball" />
                <div className={styles.rowText}>
                  <div className={styles.rowLabel}>Sound effects</div>
                  <div className={styles.rowHint}>
                    <span className={styles.muted}>{soundEnabled ? 'On' : 'Off'}</span>
                  </div>
                </div>
              </div>
              <button type="button" className={styles.action} onClick={onToggleSound}>
                {soundEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>

            <div className={styles.row}>
              <div className={styles.rowLeft}>
                <Icon className={styles.rowIcon} name="sun" />
                <div className={styles.rowText}>
                  <div className={styles.rowLabel}>Volume</div>
                  <div className={styles.rowHint}>
                    <span className={styles.muted}>{Math.round(soundVolume * 100)}%</span>
                  </div>
                </div>
              </div>
              <input
                className={styles.slider}
                type="range"
                min={0}
                max={100}
                value={Math.round(soundVolume * 100)}
                onChange={(e) => onSetSoundVolume(Number(e.target.value) / 100)}
                disabled={!soundEnabled}
                aria-label="Sound volume"
              />
            </div>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Storage</p>
            <div className={styles.row}>
              <div className={styles.rowLeft}>
                <Icon className={styles.rowIcon} name="trash" />
                <div className={styles.rowText}>
                  <div className={styles.rowLabel}>Reset app data</div>
                  <div className={styles.rowHint}>
                    Clears team, stats, favorites, Pokédex, and offline cache.
                  </div>
                </div>
              </div>
              <button type="button" className={styles.action} onClick={() => setConfirmResetOpen(true)}>
                Reset
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>About</p>
            <div className={styles.row}>
              <div className={styles.rowLeft}>
                <Icon className={styles.rowIcon} name="pokeball" />
                <div className={styles.rowText}>
                  <div className={styles.rowLabel}>
                    <span className={styles.appName}>PokeChu</span>
                  </div>
                  <div className={styles.rowHint}>
                    Pokedex application developed by Mourad. 
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </Modal>

      <Modal
        open={confirmResetOpen}
        title="Reset app data?"
        onClose={() => setConfirmResetOpen(false)}
        footer={
          <>
            <button type="button" className={styles.action} onClick={() => setConfirmResetOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                setConfirmResetOpen(false)
                onClose()
                onResetStorage()
              }}
            >
              Reset now
            </button>
          </>
        }
      >
        <p className={styles.rowHint}>
          This clears local app data and offline cache on this device (team, favorites, stats, and
          Pokédex). This can’t be undone.
        </p>
      </Modal>
    </>
  )
}
