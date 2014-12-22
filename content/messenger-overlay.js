/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function (aGlobal) {
  var Ci = Components.interfaces;
  var Cc = Components.classes;
  let observerService = Cc["@mozilla.org/observer-service;1"]
                          .getService(Ci.nsIObserverService);
  var ForceAuthAtStartUp = {
    collectAccountsToBeLoggedIn: function collectAccountsToBeLoggedIn() {
      var accountManager = MailServices.accounts;
      var allServers = accountManager.allServers;
      var serversToBeLoggedIn = [];
      for (var i = 0,  maxi = allServers.length; i < maxi; ++i) {
        let currentServer = allServers.queryElementAt(i, Ci.nsIMsgIncomingServer);
        if (currentServer.type == "none")
          continue;

        serversToBeLoggedIn.push(currentServer);
      }
      return serversToBeLoggedIn;
    },

    get serversToBeLoggedIn() {
      delete this.serversToBeLoggedIn;
      return this.serversToBeLoggedIn = this.collectAccountsToBeLoggedIn();
    },

    hideUI: function hideUI() {
      document.documentElement.style.visibility = "hidden";
    },

    showUI: function showUI() {
      document.documentElement.style.visibility = "";
    },

    exitApplication: function exitApplication() {
      var appStartup = Cc["@mozilla.org/toolkit/app-startup;1"]
                         .getService(Ci.nsIAppStartup);
      appStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
    },

    shouldBlock: function shouldBlock() {
      return this.serversToBeLoggedIn.length > 0;
    },

    run: function run() {
      if (!this.shouldBlock())
        return;

      observerService.addObserver(this, 'mail-startup-done', false);
      this.hideUI();
    },

    onMailStartupDone: function onMailStartupDone() {
      let msgWindow = MailServices.mailSession.topmostMsgWindow;

      // see: OnStopRunningUrl
      this.serversToBeLoggedIn.forEach(function (aServer) {
        aServer.verifyLogon(this, msgWindow);
      }, this);
    },

    successCount: 0,
    failureCount: 0,
    get finishedCount() {
      return this.successCount + this.failureCount;
    },

    checkAllAuthenticated: function checkAllAuthenticated() {
      if (this.finishedCount != this.serversToBeLoggedIn.length)
        return;

      if (this.successCount == this.serversToBeLoggedIn.length) {
        this.showUI();
      } else {
        this.exitApplication();
      }
    },

    // nsIObserver
    observe: function observe(aEvent) {
      observerService.removeObserver(this, 'mail-startup-done', false);
      this.onMailStartupDone();
    },

    // nsIUrlListener
    OnStartRunningUrl: function OnStartRunningUrl() {
    },
    OnStopRunningUrl: function OnStopRunningUrl(aUrl, aExitCode) {
      if (Components.isSuccessCode(aExitCode)) {
        this.successCount++;
      } else {
        this.failureCount++;
      }
      this.checkAllAuthenticated();
    },
  };

  document.addEventListener("DOMContentLoaded", function onDOMContentLoaded(aEvent) {
    document.removeEventListener("DOMContentLoaded", onDOMContentLoaded);
    ForceAuthAtStartUp.run();
  });

  aGlobal.ForceAuthAtStartUp = ForceAuthAtStartUp;
})(this);
