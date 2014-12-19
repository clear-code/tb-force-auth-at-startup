/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function (){
    var Ci = Components.interfaces;

    document.addEventListener("DOMContentLoaded", function onDOMContentLoaded(aEvent) {
	document.removeEventListener("DOMContentLoaded", onDOMContentLoaded);
	var servers = collectAccountsToBeLoggedIn();
	if (servers.length == 0)
	    return;

	setTimeout(function () {
	    let msgWindow = MailServices.mailSession.topmostMsgWindow;
	    var server = servers[0];
	    let listener = {
		OnStartRunningUrl: function () {
		},
		OnStopRunningUrl: function (url, exitCode) {
		    if (Components.isSuccessCode(exitCode)) {
			document.documentElement.style.visibility = "";
		    } else {
			window.close();
		    }
		}
	    };
	    server.verifyLogon(listener, msgWindow);
	}, 1000);
	document.documentElement.style.visibility = "hidden";
});

    function collectAccountsToBeLoggedIn() {
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
    }
})();
