(function() {
  var overlay = null;
  var panel = null;
  var body = null;
  var closeButton = null;
  var logoutButton = null;
  var titleNode = null;
  var userNameNode = null;
  var isOpen = false;
  var lastFocused = null;
  var onCloseHandler = null;
  var onLogoutHandler = null;
  var titleGroup = null;

  function ensureOverlay() {
    if (overlay) {
      return;
    }

    overlay = document.createElement('div');
    overlay.className = 'alltrack-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    panel = document.createElement('div');
    panel.className = 'alltrack-panel';

    var header = document.createElement('header');
    header.className = 'alltrack-panel__header';

    titleGroup = document.createElement('div');
    titleGroup.className = 'alltrack-panel__title-group';

    titleNode = document.createElement('h2');
    titleNode.className = 'alltrack-panel__title';
    titleNode.textContent = 'AllTrack';

    userNameNode = document.createElement('span');
    userNameNode.className = 'alltrack-panel__user';
    userNameNode.setAttribute('aria-live', 'polite');

    titleGroup.appendChild(titleNode);
    titleGroup.appendChild(userNameNode);

    var actions = document.createElement('div');
    actions.className = 'alltrack-panel__actions';

    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'alltrack-panel__close';
    closeButton.textContent = 'Закрыть';
    closeButton.setAttribute('aria-label', 'Закрыть AllTrack');

    logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.className = 'alltrack-panel__logout';
    logoutButton.textContent = 'Выйти';
    logoutButton.setAttribute('aria-label', 'Завершить сессию AllTrack');

    actions.appendChild(logoutButton);
    actions.appendChild(closeButton);

    header.appendChild(titleGroup);
    header.appendChild(actions);

    body = document.createElement('div');
    body.className = 'alltrack-panel__body';
    body.setAttribute('role', 'region');
    body.setAttribute('aria-label', 'Содержимое AllTrack');

    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);

    overlay.addEventListener('mousedown', function(event) {
      if (event.target === overlay) {
        close();
      }
    });

    overlay.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    });

    closeButton.addEventListener('click', function(event) {
      event.preventDefault();
      close();
    });

    logoutButton.addEventListener('click', function(event) {
      event.preventDefault();
      if (typeof onLogoutHandler === 'function') {
        onLogoutHandler();
      }
      close();
    });

    document.body.appendChild(overlay);
  }

  function open(options) {
    if (isOpen) {
      return;
    }

    ensureOverlay();
    isOpen = true;
    onCloseHandler = options && typeof options.onClose === 'function' ? options.onClose : null;
    onLogoutHandler = options && typeof options.onLogout === 'function' ? options.onLogout : null;
    lastFocused = document.activeElement;

    if (userNameNode) {
      var nextName = options && typeof options.userName === 'string' ? options.userName.trim() : '';
      userNameNode.textContent = nextName ? '\u00b7 ' + nextName : '';
      userNameNode.style.display = nextName ? 'inline-flex' : 'none';
    }

    if (logoutButton) {
      if (typeof onLogoutHandler === 'function') {
        logoutButton.hidden = false;
        logoutButton.disabled = false;
        logoutButton.setAttribute('aria-hidden', 'false');
        logoutButton.setAttribute('tabindex', '0');
      } else {
        logoutButton.hidden = true;
        logoutButton.disabled = true;
        logoutButton.setAttribute('aria-hidden', 'true');
        logoutButton.setAttribute('tabindex', '-1');
      }
    }

    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('alltrack-open');

    if (closeButton) {
      try {
        closeButton.focus({ preventScroll: true });
      } catch (focusError) {
        closeButton.focus();
      }
    }
  }

  function close() {
    if (!isOpen) {
      return;
    }

    isOpen = false;
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('alltrack-open');

    if (typeof onCloseHandler === 'function') {
      onCloseHandler();
    }

    if (lastFocused && typeof lastFocused.focus === 'function') {
      try {
        lastFocused.focus({ preventScroll: true });
      } catch (focusError) {
        lastFocused.focus();
      }
    }

    lastFocused = null;
    onCloseHandler = null;
    onLogoutHandler = null;
  }

  window.AllTrackStart = {
    open: open,
    close: close
  };

  window.startAllTrack = function() {
    return window.AllTrackStart;
  };
})();