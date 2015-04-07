/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function (aGlobal) {
  var Ci = Components.interfaces;
  var Cc = Components.classes;
  let observerService = Cc["@mozilla.org/observer-service;1"]
                          .getService(Ci.nsIObserverService);
  let Pref = Cc["@mozilla.org/preferences;1"]
               .getService(Ci.nsIPrefBranch);
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

      observerService.addObserver(this, "mail-startup-done", false);
      this.hideUI();
    },

    onMailStartupDone: function onMailStartupDone() {
      let msgWindow = MailServices.mailSession.topmostMsgWindow;

      // see: OnStopRunningUrl
      this.serversToBeLoggedIn.forEach(function (aServer) {
        var listener = this.createListenerFor(aServer);
        aServer.verifyLogon(listener, msgWindow);
      }, this);
    },

    createListenerFor: function createListener(aServer) {
      // "verifyLogon" clears existing popstate.dat.
      // We have to do backup/restore it manually.
      // See also:
      //   http://mxr.mozilla.org/comm-esr31/source/mailnews/local/src/nsPop3Service.cpp#146
      //   http://mxr.mozilla.org/comm-esr31/source/mailnews/local/src/nsPop3Protocol.cpp#575
      //   http://mxr.mozilla.org/comm-esr31/source/mailnews/local/src/nsPop3Protocol.cpp#1069
      var popstate = null;
      if (aServer.type == "pop3")
        popstate = this.readPopstateFor(aServer);

      return {
        // nsIUrlListener
        OnStartRunningUrl: function OnStartRunningUrl() {
        },
        OnStopRunningUrl: (function OnStopRunningUrl(aUrl, aExitCode) {
          if (popstate)
            this.writePopstateFor(aServer, popstate);

          if (Components.isSuccessCode(aExitCode)) {
            this.successCount++;
          } else {
            this.failureCount++;
          }
          this.checkAllAuthenticated();
        }).bind(this)
      };
    },

    getPopstateDatFor: function getPopstateDatFor(aServer) {
      var file = aServer.localPath.clone();
      file.append("popstate.dat");
      return file;
    },

    readPopstateFor: function readPopstateFor(aServer) {
      var file = this.getPopstateDatFor(aServer);
      if (!file.exists())
        return null;

      var stream = Cc["@mozilla.org/network/file-input-stream;1"]
                     .createInstance(Ci.nsIFileInputStream);
      var scriptableStream = Cc["@mozilla.org/scriptableinputstream;1"]
                               .createInstance(Ci.nsIScriptableInputStream);
      scriptableStream.init(stream);
      var fileContents = scriptableStream.read(scriptableStream.available());
      scriptableStream.close();
      stream.close();
      return fileContents;
    },

    writePopstateFor: function writePopstateFor(aServer, aState) {
      if (!aState)
        return;

      var file = this.getPopstateDatFor(aServer);
      if (file.exists())
        file.remove(true);
      file.create(file.NORMAL_FILE_TYPE, 0666);
      var stream = Cc["@mozilla.org/network/file-output-stream;1"]
                     .createInstance(Ci.nsIFileOutputStream);
      stream.init(file, 2, 0x200, false); // open as "write only"
      stream.write(aState, aState.length);
      stream.close();
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
        this.onSuccess();
      } else {
        this.exitApplication();
      }
    },

    // nsIObserver
    observe: function observe(aEvent) {
      observerService.removeObserver(this, "mail-startup-done", false);
      this.onMailStartupDone();
    },

    onSuccess: function onSuccess() {
      this.showUI();
      try {
        let callback = Pref.getCharPref("extensions.force-auth-at-startup@clear-code.com.on_success");
        if (callback) {
          try {
            (new Function(callback))();
          }
          catch(error) {
            Components.utils.reportError(error);
          }
        }
      }
      catch(error) {
      }
    }
  };

  document.addEventListener("DOMContentLoaded", function onDOMContentLoaded(aEvent) {
    document.removeEventListener("DOMContentLoaded", onDOMContentLoaded);
    ForceAuthAtStartUp.run();
  });

  aGlobal.ForceAuthAtStartUp = ForceAuthAtStartUp;
})(this);
