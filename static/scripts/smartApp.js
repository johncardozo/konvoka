// appDOM - Enhanced Vanilla JavaScript Plugin for DOM Manipulation and UI Controls
(function (window) {
  'use strict';

  // Create global appDOM object
  window.appDOM = function () {
    // Private variables and cache
    const htmlRoot = document.documentElement;
    const cache = {
      actionButtons: null,
      audioCache: new Map()
    };

    // Configuration object with security limits
    const config = {
      debug: false,
      focusDelay: 200,
      defaultSoundPath: 'media/sound/',
      maxClassNameLength: 50,
      maxSelectorLength: 255,
      fullscreenConfirmMessage: 'Do you want to enter fullscreen mode?',
      selectors: {
        actionButtons: '[data-action]'
      },
      sound: {
        preload: false,
        volume: 1.0,
        fadeIn: false,
        fadeInDuration: 500
      },
      classes: {
        classesToKeep: ['hide-page-scrollbar'] // Classes that won't be removed during reset
      }
    };

    // Main plugin object
    const plugin = {
      // Check if string contains substring
      containsSubstring: function (string, substring) {
        if (!string || !substring) {
          logger.warn('Invalid parameters for containsSubstring');
          return false;
        }
        const regex = new RegExp(`\\b${substring}\\b`, 'i');
        return regex.test(string);
      },
      // Reset style function
      resetStyle: function () {
        logger.group('Reset Style');
        const dataAction = document.querySelectorAll(config.selectors.actionButtons);

        // Reset all action buttons
        dataAction.forEach(element => {
          if (element.type === 'checkbox') {
            element.checked = false;
            element.parentNode.classList.remove("active");
          } else {
            element.classList.remove("active");
          }
        });

        // Keep specific classes while removing others
        const currentClasses = htmlRoot.className.split(' ');
        const filteredClasses = currentClasses.filter(className => config.classes.classesToKeep.includes(className));
        htmlRoot.className = filteredClasses.join(' ');
        resetSettings();
        logger.log('Styles reset completed');
        logger.groupEnd();
        return plugin;
      }
    };

    // Enhanced Security utilities
    const security = {
      sanitizeClassName: function (className) {
        if (typeof className !== 'string') {
          logger.error('Invalid class name type');
          return '';
        }

        // Length check to prevent DoS
        if (className.length > config.maxClassNameLength) {
          logger.error(`Class name exceeds maximum length of ${config.maxClassNameLength} characters`);
          return '';
        }

        // Enhanced pattern to only allow valid CSS class characters
        const sanitized = className.replace(/[^a-zA-Z0-9-_]/g, '').replace(/^[0-9-_]/, '').substring(0, config.maxClassNameLength);
        if (sanitized !== className) {
          logger.warn(`Class name "${className}" contained invalid characters and was sanitized to "${sanitized}"`);
        }
        return sanitized;
      },
      sanitizeSelector: function (selector) {
        if (typeof selector !== 'string') {
          logger.error('Invalid selector type');
          return '';
        }

        // Length check to prevent DoS
        if (selector.length > config.maxSelectorLength) {
          logger.error(`Selector exceeds maximum length of ${config.maxSelectorLength} characters`);
          return '';
        }

        // Enhanced CSS injection prevention
        if (/<[^>]*>|javascript:|data:|@import|expression|url\(|eval\(|setTimeout|setInterval/i.test(selector)) {
          logger.error('Potential malicious selector detected');
          return '';
        }

        // Only allow valid CSS selectors and escape potentially dangerous characters
        const sanitized = selector.replace(/[<>"'`=\/\\]/g, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
        return sanitized;
      },
      validateDataAttribute: function (attribute) {
        if (typeof attribute !== 'string') {
          logger.error('Invalid data attribute type');
          return '';
        }

        // Length check
        if (attribute.length > config.maxClassNameLength) {
          logger.error(`Data attribute exceeds maximum length of ${config.maxClassNameLength} characters`);
          return '';
        }

        // Enhanced pattern for data attributes
        return attribute.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, config.maxClassNameLength);
      },
      checkFullscreenPermission: function () {
        if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled && !document.mozFullScreenEnabled && !document.msFullscreenEnabled) {
          logger.error('Fullscreen not supported in this browser');
          return false;
        }
        if (window.self !== window.top) {
          try {
            if (!window.parent.document.fullscreenEnabled) {
              logger.error('Fullscreen not allowed in iframe');
              return false;
            }
          } catch (e) {
            logger.error('Cannot access parent frame for fullscreen permission');
            return false;
          }
        }
        return true;
      },
      getClosestElement: function (element, selector) {
        if (!element || !selector) {
          logger.error('Invalid parameters for getClosestElement');
          return null;
        }
        try {
          return element.closest(selector);
        } catch (error) {
          logger.error(`Error finding closest element: ${error.message}`);
          return null;
        }
      }
    };

    // Debug logger
    const logger = {
      log: function (msg) {
        if (config.debug) console.log(`[SmartAdmin] ${msg}`);
      },
      error: function (msg) {
        if (config.debug) console.error(`[SmartAdmin Error] ${msg}`);
      },
      warn: function (msg) {
        if (config.debug) console.warn(`[SmartAdmin Warning] ${msg}`);
      },
      group: function (name) {
        if (config.debug) console.group(`[SmartAdmin Group] ${name}`);
      },
      groupEnd: function () {
        if (config.debug) console.groupEnd();
      }
    };

    // Audio Helper Functions
    const audioHelpers = {
      sanitizeFilename: function (filename) {
        return filename.replace(/[^\w.-]/g, '');
      },
      fadeInAudio: async function (audio, targetVolume, duration) {
        audio.volume = 0;
        const steps = 20;
        const increment = targetVolume / steps;
        const stepDuration = duration / steps;
        for (let i = 0; i <= steps; i++) {
          await new Promise(resolve => setTimeout(resolve, stepDuration));
          audio.volume = Math.min(targetVolume, i * increment);
        }
      },
      createAudioElement: function (path, sound, volume) {
        const audio = new Audio();
        audio.src = `${path}${sound}`;
        audio.volume = volume;
        return audio;
      },
      // Add new helper to stop all sounds except one
      stopAllSoundsExcept: function (exceptSound) {
        cache.audioCache.forEach((audio, key) => {
          if (key !== exceptSound && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
            // Find and update any elements playing this sound
            const playingElements = document.querySelectorAll(`[data-audio-playing="${key}"]`);
            playingElements.forEach(el => el.removeAttribute('data-audio-playing'));
          }
        });
      }
    };

    // Utility functions
    const utils = {
      debounce: function (func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      },
      validateElement: function (element, name) {
        if (!element) {
          logger.error(`${name} element not found`);
          return false;
        }
        return true;
      }
    };

    // Enhanced fullscreen handler
    const fullscreenHandler = {
      enter: function () {
        try {
          if (document.documentElement.requestFullscreen) {
            return document.documentElement.requestFullscreen();
          } else if (document.documentElement.webkitRequestFullscreen) {
            return document.documentElement.webkitRequestFullscreen();
          } else if (document.documentElement.mozRequestFullScreen) {
            return document.documentElement.mozRequestFullScreen();
          } else if (document.documentElement.msRequestFullscreen) {
            return document.documentElement.msRequestFullscreen();
          }
          throw new Error('No fullscreen API available');
        } catch (error) {
          logger.error(`Fullscreen error: ${error.message}`);
          return Promise.reject(error);
        }
      },
      exit: function () {
        try {
          if (document.exitFullscreen) {
            return document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            return document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            return document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            return document.msExitFullscreen();
          }
          throw new Error('No fullscreen API available');
        } catch (error) {
          logger.error(`Fullscreen exit error: ${error.message}`);
          return Promise.reject(error);
        }
      },
      isFullscreen: function () {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      }
    };

    // Check active styles
    plugin.checkActiveStyles = function (target, data) {
      logger.group('Checking Active Styles');
      const classes = htmlRoot.className.split(" ") || target;
      const dataAction = document.querySelectorAll(config.selectors.actionButtons) || data;
      dataAction.forEach(element => {
        if (element.type === 'checkbox') {
          element.checked = false;
          element.parentNode.classList.remove("active");
        } else {
          element.classList.remove("active");
        }
      });
      classes.forEach(className => {
        const sanitizedClass = security.sanitizeClassName(className);
        const elements = document.querySelectorAll(`[data-class="${sanitizedClass}"]`);
        elements.forEach(element => {
          if (element.type === 'checkbox') {
            element.checked = true;
            element.parentNode.classList.add("active");
          } else {
            element.classList.add("active");
          }
        });
      });
      logger.groupEnd();
      return plugin;
    };

    // Enhanced handlers with all implementations
    const handlers = {
      toggle: function (element) {
        const dataClass = security.sanitizeClassName(element.getAttribute('data-class'));
        const depClass = element.getAttribute('data-dependency');
        const coDepClass = element.getAttribute('data-codependence');
        const inputFocus = security.validateDataAttribute(element.getAttribute('data-focus'));
        logger.group('Toggle Action');
        logger.log(`Toggling class: ${dataClass}`);
        htmlRoot.classList.toggle(dataClass);
        if (depClass) {
          depClass.split(" ").forEach(cls => {
            const sanitizedClass = security.sanitizeClassName(cls);
            htmlRoot.classList.add(sanitizedClass);
            logger.log(`Added dependency class: ${sanitizedClass}`);
          });
        }
        if (coDepClass) {
          coDepClass.split(" ").forEach(cls => {
            const sanitizedClass = security.sanitizeClassName(cls);
            htmlRoot.classList.remove(sanitizedClass);
            logger.log(`Removed codependency class: ${sanitizedClass}`);
          });
        }
        if (inputFocus) {
          setTimeout(() => {
            const focusElement = document.getElementById(inputFocus);
            if (focusElement) focusElement.focus();
            logger.log(`Focus set to element: ${inputFocus}`);
          }, config.focusDelay);
        }
        if (typeof window.saveSettings === 'function') {
          window.saveSettings();
          logger.log('Settings saved');
        }
        plugin.checkActiveStyles();
        logger.groupEnd();
      },
      toggleReplace: function (element) {
        const target = security.sanitizeSelector(element.getAttribute('data-target'));
        const removeClass = security.sanitizeClassName(element.getAttribute('data-removeclass')) || "";
        const addClass = security.sanitizeClassName(element.getAttribute('data-addclass'));
        const targetElement = document.querySelector(target);
        logger.group('Toggle Replace Action');
        if (targetElement) {
          targetElement.classList.remove(removeClass);
          targetElement.classList.add(addClass);
          logger.log(`Replaced class "${removeClass}" with "${addClass}" on ${target}`);
        } else {
          logger.error(`Target element not found: ${target}`);
        }
        logger.groupEnd();
      },
      toggleSwap: function (element) {
        const targetAttr = element.getAttribute('data-target');
        const target = targetAttr ? security.sanitizeSelector(targetAttr) : 'html';
        const toggleClass = security.sanitizeClassName(element.getAttribute('data-toggleclass'));
        logger.group('Toggle Swap Action');
        if (!toggleClass) {
          logger.error('Missing required toggleclass attribute for toggle-swap, defaulting to HTML target');
          logger.groupEnd();
          return;
        }
        const targetElement = document.querySelector(target);
        if (!targetElement) {
          logger.error(`Target element not found: ${target}`);
          logger.groupEnd();
          return;
        }
        targetElement.classList.toggle(toggleClass);
        logger.log(`Toggled class "${toggleClass}" on ${target}`);
        if (plugin.containsSubstring(target, 'drawer')) {
          htmlRoot.classList.toggle('hide-page-scrollbar');
          logger.log('Toggled page scrollbar');
        }
        logger.groupEnd();
      },
      panelActions: {
        hideTooltips: function (panel) {
          // Find all tooltips in the panel and hide them
          const tooltipTriggers = panel.querySelectorAll('[data-bs-toggle="tooltip"]');
          tooltipTriggers.forEach(el => {
            const tooltip = bootstrap.Tooltip.getInstance(el);
            if (tooltip) {
              tooltip.hide();
            }
          });
        },
        collapse: function (element) {
          logger.group('Panel Collapse Action');
          const selectedPanel = security.getClosestElement(element, '.panel');
          if (!selectedPanel) {
            logger.error('Panel element not found');
            logger.groupEnd();
            return;
          }

          // Hide tooltips before collapsing
          this.hideTooltips(selectedPanel);
          const panelContainer = selectedPanel.querySelector('.panel-container');
          if (!panelContainer) {
            logger.error('Panel container not found');
            logger.groupEnd();
            return;
          }

          // Always ensure transition is set
          panelContainer.style.transition = 'height 0.35s ease';

          // Store the current height before any changes
          const startHeight = panelContainer.scrollHeight;

          // Toggle panel collapsed state
          if (selectedPanel.classList.contains('panel-collapsed')) {
            // For expanding: First ensure we're at 0 height
            panelContainer.style.height = '0';
            panelContainer.style.overflow = 'hidden';
            // Force a reflow
            panelContainer.offsetHeight;

            // Remove collapsed class
            selectedPanel.classList.remove('panel-collapsed');

            // Animate to full height
            panelContainer.style.height = startHeight + 'px';

            // After animation completes
            setTimeout(function () {
              panelContainer.style.overflow = 'visible';
              panelContainer.style.height = 'auto';
            }, 350);
            logger.log('Panel uncollapsed: ' + selectedPanel.id);
          } else {
            // For collapsing: First set exact current height
            panelContainer.style.height = startHeight + 'px';
            panelContainer.style.overflow = 'hidden';
            // Force a reflow
            panelContainer.offsetHeight;

            // Add collapsed class
            selectedPanel.classList.add('panel-collapsed');

            // Animate to 0
            panelContainer.style.height = '0';
            logger.log('Panel collapsed: ' + selectedPanel.id);
          }

          // Save panel state after toggle
          savePanelState();
          logger.groupEnd();
        },
        fullscreen: function (element) {
          logger.group('Panel Fullscreen Action');
          const selectedPanel = security.getClosestElement(element, '.panel');
          if (!selectedPanel) {
            logger.error('Panel element not found');
            logger.groupEnd();
            return;
          }

          // Hide tooltips before fullscreen
          this.hideTooltips(selectedPanel);
          selectedPanel.classList.toggle('panel-fullscreen');
          document.documentElement.classList.toggle('panel-fullscreen');
          logger.log(`Panel fullscreen toggled: ${selectedPanel.id}`);
          logger.groupEnd();
        },
        close: function (element) {
          logger.group('Panel Close Action');
          const selectedPanel = security.getClosestElement(element, '.panel');
          if (!selectedPanel) {
            logger.error('Panel element not found');
            logger.groupEnd();
            return;
          }

          // Hide tooltips before showing close confirmation
          this.hideTooltips(selectedPanel);
          const panelTitle = selectedPanel.querySelector('.panel-hdr h2')?.textContent.trim() || 'Untitled Panel';
          const killPanel = () => {
            selectedPanel.style.transition = 'opacity 0.5s';
            selectedPanel.style.opacity = '0';
            setTimeout(() => {
              selectedPanel.remove();
              logger.log(`Panel removed: ${selectedPanel.id}`);
            }, 500);
          };

          // Create modal if it doesn't exist
          let confirmModal = document.getElementById('panelDeleteModal');
          if (!confirmModal) {
            const modalHTML = `
                            <div class="modal fade" id="panelDeleteModal" tabindex="-1" aria-hidden="true" style="--bs-modal-width: 450px;">
                                <div class="modal-dialog modal-dialog-centered">
                                    <div class="modal-content bg-dark bg-opacity-50 shadow-5 translucent-dark">
                                        <div class="modal-header border-bottom-0">
                                            <h4 class="modal-title text-white d-flex align-items-center">
                                                Delete Panel?
                                            </h4>
                                            <button type="button" class="btn btn-system btn-system-light ms-auto" data-bs-dismiss="modal" aria-label="Close">
                                                <svg class="sa-icon sa-icon-2x">
                                                    <use href="img/sprite.svg#x"></use>
                                                </svg>
                                            </button>
                                        </div>
                                        <div class="modal-body"></div>
                                        <div class="modal-footer border-top-0">
                                            <button type="button" class="btn btn-light" data-bs-dismiss="modal">No, cancel</button>
                                            <button type="button" class="btn btn-danger" id="confirmPanelDelete">Yes, delete</button>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            confirmModal = document.getElementById('panelDeleteModal');
          }

          // Update modal content with current panel title
          const modalBody = confirmModal.querySelector('.modal-body');
          //modalBody.textContent = `You are about to delete <strong>${panelTitle}</strong>`;
          modalBody.innerHTML = `
                    <div class="alert alert-danger bg-danger border-danger text-danger border-opacity-50 bg-opacity-10 mb-0">
                        You are about to delete <span class="fw-700">${panelTitle}.</span>
                        Are you sure you want to delete this panel?
                    </div>`;

          // Initialize Bootstrap modal
          const modal = new bootstrap.Modal(confirmModal);

          // Set up delete confirmation handler
          const confirmDeleteBtn = confirmModal.querySelector('#confirmPanelDelete');
          const deleteHandler = () => {
            //createUndoButton();
            killPanel();
            modal.hide();
            confirmDeleteBtn.removeEventListener('click', deleteHandler);
          };
          confirmDeleteBtn.addEventListener('click', deleteHandler);

          // Show modal
          modal.show();

          // Clean up when modal is hidden
          confirmModal.addEventListener('hidden.bs.modal', () => {
            confirmDeleteBtn.removeEventListener('click', deleteHandler);
          }, {
            once: true
          });
          logger.groupEnd();
        },
        style: function (element) {
          logger.group('Panel Style Action');

          // First find the panel container from any location
          const panel = security.getClosestElement(element, '.panel');
          if (!panel) {
            logger.error('Panel element not found');
            logger.groupEnd();
            return;
          }

          // Then find the header within the panel
          const selectedPanel = panel.querySelector('.panel-hdr');
          if (!selectedPanel) {
            logger.error('Panel header not found');
            logger.groupEnd();
            return;
          }
          const styleAttr = element.getAttribute('data-panel-style');
          if (!styleAttr) {
            logger.error('No style classes specified');
            logger.groupEnd();
            return;
          }

          // Split and sanitize each class
          const newStyles = styleAttr.split(' ').map(style => security.sanitizeClassName(style.trim())).filter(style => style.startsWith('bg-')); // Only accept bg-* classes

          if (newStyles.length === 0) {
            logger.error('No valid bg-* classes specified');
            logger.groupEnd();
            return;
          }

          // Remove existing bg-* classes
          const existingClasses = Array.from(selectedPanel.classList).filter(className => className.startsWith('bg-'));
          existingClasses.forEach(className => {
            selectedPanel.classList.remove(className);
          });

          // Add new bg classes
          newStyles.forEach(style => {
            selectedPanel.classList.add(style);
            logger.log(`Added panel style: ${style}`);
          });

          // Save panel state
          savePanelState();
          logger.groupEnd();
        },
        toggleClass: function (element) {
          logger.group('Panel Toggle Class Action');

          // First find the panel container from any location
          const selectedPanel = security.getClosestElement(element, '.panel');
          if (!selectedPanel) {
            logger.error('Panel element not found');
            logger.groupEnd();
            return;
          }
          const toggleClass = security.sanitizeClassName(element.getAttribute('data-panel-toggle'));
          if (!toggleClass) {
            logger.error('No toggle class specified');
            logger.groupEnd();
            return;
          }

          // Toggle class on the panel itself
          selectedPanel.classList.toggle(toggleClass);
          logger.log(`Panel class toggled: ${toggleClass}`);

          // Save panel state
          savePanelState();
          logger.groupEnd();
        },
        reset: function (element) {
          logger.group('Panel Reset Action');

          // First find the panel container from any location
          const selectedPanel = security.getClosestElement(element, '.panel');
          if (!selectedPanel) {
            logger.error('Panel element not found');
            logger.groupEnd();
            return;
          }

          // Get all classes
          const panelClasses = Array.from(selectedPanel.classList);
          const headerElement = selectedPanel.querySelector('.panel-hdr');

          // Remove all classes except the preserved ones from panel
          panelClasses.forEach(className => {
            if (!['panel', 'panel-collapsed', 'panel-fullscreen'].includes(className)) {
              selectedPanel.classList.remove(className);
            }
          });

          // Reset header classes if it exists
          if (headerElement) {
            const headerClasses = Array.from(headerElement.classList);
            headerClasses.forEach(className => {
              if (className !== 'panel-hdr') {
                headerElement.classList.remove(className);
              }
            });
          }
          logger.log('Panel reset to default state');

          // Save panel state
          savePanelState();
          logger.groupEnd();
        },
        refresh: function (element) {
          logger.group('Panel Refresh Action');
          const selectedPanel = security.getClosestElement(element, '.panel');
          if (!selectedPanel) {
            logger.error('Panel element not found');
            logger.groupEnd();
            return;
          }

          // Get refresh duration from data attribute or use default
          const refreshDuration = parseInt(element.getAttribute('data-refresh-duration')) || 1000;

          // Check if panel is already refreshing
          if (selectedPanel.classList.contains('panel-refreshing')) {
            logger.warn('Panel is already refreshing');
            logger.groupEnd();
            return;
          }

          // Add refreshing class
          selectedPanel.classList.add('panel-refreshing');
          logger.log('Panel refresh started');

          // Get callback function name from data attribute
          const callbackName = element.getAttribute('data-refresh-callback');

          // Execute callback if it exists
          if (callbackName && typeof window[callbackName] === 'function') {
            try {
              window[callbackName](selectedPanel);
              logger.log(`Executed callback: ${callbackName}`);
            } catch (error) {
              logger.error(`Error in refresh callback: ${error.message}`);
            }
          }

          // Remove refreshing class after duration
          setTimeout(() => {
            selectedPanel.classList.remove('panel-refreshing');
            logger.log('Panel refresh completed');
          }, refreshDuration);
          logger.groupEnd();
        }
      },
      toggleTheme: function () {
        logger.group('Toggle Theme Action');

        // Get current theme or default to 'light'
        const currentTheme = htmlRoot.getAttribute('data-bs-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        // Set the new theme
        htmlRoot.setAttribute('data-bs-theme', newTheme);
        logger.log(`Theme switched to: ${newTheme}`);

        // Save settings if available
        if (typeof window.saveSettings === 'function') {
          window.saveSettings();
          logger.log('Theme settings saved');
        }
        logger.groupEnd();
      },
      removeClass: function (element) {
        const target = security.sanitizeSelector(element.getAttribute('data-target'));
        const className = security.sanitizeClassName(element.getAttribute('data-classname'));
        const targetElement = document.querySelector(target);
        logger.group('Remove Class Action');
        if (targetElement?.classList.contains(className)) {
          targetElement.classList.remove(className);
          logger.log(`Removed class "${className}" from ${target}`);
        }
        if (target === 'html' && typeof window.saveSettings === 'function') {
          window.saveSettings();
          plugin.checkActiveStyles();
          logger.log('Settings saved');
        }
        logger.groupEnd();
      },
      addClass: function (element) {
        const target = security.sanitizeSelector(element.getAttribute('data-target'));
        const className = security.sanitizeClassName(element.getAttribute('data-classname'));
        const targetElement = document.querySelector(target);
        logger.group('Add Class Action');
        if (targetElement) {
          targetElement.classList.add(className);
          logger.log(`Added class "${className}" to ${target}`);
        } else {
          logger.error(`Target element not found: ${target}`);
        }
        if (target === 'html' && typeof window.saveSettings === 'function') {
          window.saveSettings();
          plugin.checkActiveStyles();
          logger.log('Settings saved');
        }
        logger.groupEnd();
      },
      appFullscreen: function () {
        logger.group('Fullscreen Action');
        if (!security.checkFullscreenPermission()) {
          logger.error('Fullscreen permission denied');
          logger.groupEnd();
          return;
        }
        if (!fullscreenHandler.isFullscreen()) {
          if (window.confirm(config.fullscreenConfirmMessage)) {
            fullscreenHandler.enter().then(() => logger.log('Entered fullscreen mode')).catch(error => logger.error(`Fullscreen error: ${error.message}`));
          }
        } else {
          fullscreenHandler.exit().then(() => logger.log('Exited fullscreen mode')).catch(error => logger.error(`Fullscreen exit error: ${error.message}`));
        }
        logger.groupEnd();
      },
      playSound: async function (element) {
        logger.group('Play Sound Action');
        try {
          const soundFile = element.getAttribute('data-soundfile');
          if (!soundFile) {
            throw new Error('No sound file specified');
          }
          const sanitizedSound = audioHelpers.sanitizeFilename(soundFile);

          // Check if this sound is currently playing
          if (element.getAttribute('data-audio-playing') === sanitizedSound) {
            // If it's playing, pause it
            handlers.pauseSound(element);
            return;
          }

          // Stop all other playing sounds
          audioHelpers.stopAllSoundsExcept(sanitizedSound);
          const path = config.defaultSoundPath;

          // Try to get from cache first
          let audioElement = cache.audioCache.get(sanitizedSound);
          if (!audioElement) {
            audioElement = audioHelpers.createAudioElement(path, sanitizedSound, config.sound.volume);
            cache.audioCache.set(sanitizedSound, audioElement);
          }

          // Reset the audio if it was previously played
          audioElement.currentTime = 0;

          // Apply fade-in if enabled
          if (config.sound.fadeIn) {
            await audioHelpers.fadeInAudio(audioElement, config.sound.volume, config.sound.fadeInDuration);
          }
          await audioElement.play();

          // Store the currently playing audio element in a data attribute
          element.setAttribute('data-audio-playing', sanitizedSound);
          logger.log(`Playing sound: ${path}${sanitizedSound}`);

          // Return promise that resolves when audio finishes playing
          return new Promise((resolve, reject) => {
            audioElement.addEventListener('ended', () => {
              element.removeAttribute('data-audio-playing');
              resolve();
            }, {
              once: true
            });
            audioElement.addEventListener('error', e => reject(e), {
              once: true
            });
          });
        } catch (error) {
          logger.error(`Failed to play sound: ${error.message}`);
          throw error;
        } finally {
          logger.groupEnd();
        }
      },
      pauseSound: function (element) {
        logger.group('Pause Sound Action');
        try {
          const playingSound = element.getAttribute('data-audio-playing');
          if (!playingSound) {
            logger.log('No sound currently playing');
            return;
          }
          const audioElement = cache.audioCache.get(playingSound);
          if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0; // Reset to beginning
            element.removeAttribute('data-audio-playing');
            logger.log(`Paused sound: ${playingSound}`);
          }
        } catch (error) {
          logger.error(`Failed to pause sound: ${error.message}`);
        } finally {
          logger.groupEnd();
        }
      }
    };

    // Event delegation handler
    // Modify your handleAction function to include panel actions
    function handleAction(event) {
      const element = event.target.closest(config.selectors.actionButtons);
      if (!element) return;
      const actionType = security.validateDataAttribute(element.dataset.action);

      // Add panel actions to the handler object
      const handler = {
        'toggle': () => handlers.toggle(element),
        'toggle-replace': () => handlers.toggleReplace(element),
        'toggle-swap': () => handlers.toggleSwap(element),
        'remove-class': () => handlers.removeClass(element),
        'add-class': () => handlers.addClass(element),
        'app-fullscreen': () => handlers.appFullscreen(),
        'playsound': () => handlers.playSound(element),
        'pausesound': () => handlers.pauseSound(element),
        // Add panel actions
        'panel-collapse': () => handlers.panelActions.collapse(element),
        'panel-fullscreen': () => handlers.panelActions.fullscreen(element),
        'panel-close': () => handlers.panelActions.close(element),
        'panel-style': () => handlers.panelActions.style(element),
        'panel-toggle': () => handlers.panelActions.toggleClass(element),
        'panel-reset': () => handlers.panelActions.reset(element),
        'panel-refresh': () => handlers.panelActions.refresh(element),
        'toggle-theme': () => handlers.toggleTheme()
      }[actionType];
      if (handler) {
        handler();
        logger.log(`Action executed: ${actionType}`);
      } else {
        logger.warn(`Unknown action type: ${actionType}`);
      }
    }

    // Add sound-specific methods to plugin
    plugin.preloadSound = function (soundFile) {
      const sanitizedSound = audioHelpers.sanitizeFilename(soundFile);
      if (!cache.audioCache.has(sanitizedSound)) {
        const audio = audioHelpers.createAudioElement(config.defaultSoundPath, sanitizedSound, config.sound.volume);
        cache.audioCache.set(sanitizedSound, audio);
      }
      return plugin;
    };

    // Configuration methods
    plugin.config = function (options) {
      Object.assign(config, options);
      logger.log('Configuration updated');
      return plugin;
    };
    plugin.debug = function (enabled) {
      config.debug = enabled;
      // Add or remove debug class on body element
      const debugClass = 'app-debug-mode';
      if (enabled) {
        document.body.classList.add(debugClass);
      } else {
        document.body.classList.remove(debugClass);
      }
      logger.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
      return plugin;
    };

    // Add programmatic methods for actions
    plugin.toggleTheme = function () {
      handlers.toggleTheme();
      return plugin;
    };
    plugin.toggleClass = function (target, className) {
      if (!target || !className) {
        logger.error('Target and className are required for toggleClass');
        return plugin;
      }
      const element = document.createElement('button');
      element.setAttribute('data-action', 'toggle');
      element.setAttribute('data-class', className);
      element.setAttribute('data-target', target);
      handlers.toggle(element);
      return plugin;
    };
    plugin.toggleReplace = function (target, removeClass, addClass) {
      if (!target || !addClass) {
        logger.error('Target and addClass are required for toggleReplace');
        return plugin;
      }
      const element = document.createElement('button');
      element.setAttribute('data-action', 'toggle-replace');
      element.setAttribute('data-target', target);
      element.setAttribute('data-addclass', addClass);
      if (removeClass) {
        element.setAttribute('data-removeclass', removeClass);
      }
      handlers.toggleReplace(element);
      return plugin;
    };
    plugin.toggleSwap = function (target, toggleClass) {
      if (!target || !toggleClass) {
        logger.error('Target and toggleClass are required for toggleSwap');
        return plugin;
      }
      const element = document.createElement('button');
      element.setAttribute('data-action', 'toggle-swap');
      element.setAttribute('data-target', target);
      element.setAttribute('data-toggleclass', toggleClass);
      handlers.toggleSwap(element);
      return plugin;
    };

    // Enhanced cleanup method
    plugin.destroy = function () {
      document.removeEventListener('click', handleAction);
      cache.actionButtons = null;

      // Clean up audio cache
      cache.audioCache.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      cache.audioCache.clear();
      logger.log('Plugin destroyed');
    };

    // Initialize plugin
    function init() {
      document.addEventListener('click', handleAction);
      document.addEventListener('DOMContentLoaded', function () {
        cache.actionButtons = document.querySelectorAll(config.selectors.actionButtons);
        plugin.checkActiveStyles();
        logger.log('Plugin initialized');
      });
    }

    // Initialize the plugin
    init();

    // Return public methods
    return plugin;
  }();
})(window);

// document.addEventListener('DOMContentLoaded', function() {
//     appDOM.checkActiveStyles().debug(true);
// });