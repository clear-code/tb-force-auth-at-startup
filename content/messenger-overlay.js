/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function (){
    document.addEventListener("DOMContentLoaded", function onDOMContentLoaded(aEvent) {
	document.removeEventListener("DOMContentLoaded", onDOMContentLoaded);
	checkAccount();
	document.documentElement.style.visibility = "hidden";
	setTimeout(function () {
            document.documentElement.style.visibility = "";
	}, 1000);
});

function checkAccount() {
    alert(MailServices.accounts);
}
})();
