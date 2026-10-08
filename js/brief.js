/*
  The private "Your brief" page. Only used when the optional server is running.

  The address looks like  brief.html#<id>.<key>
  The part after # never leaves the browser in a page request, so the key is
  not written to server logs. It is sent only in the Authorization header.
  Everything shown is written with textContent, so stored text cannot run.
*/
(function () {
  "use strict";

  var doc = document;
  var status = doc.querySelector("[data-brief-status]");
  var body = doc.querySelector("[data-brief-body]");
  var list = doc.querySelector("[data-brief-list]");
  var fileRow = doc.querySelector("[data-brief-file]");
  var downloadBtn = doc.querySelector("[data-brief-download]");
  var deleteBtn = doc.querySelector("[data-brief-delete]");
  if (!status || !body || !list) { return; }

  var hash = location.hash.replace(/^#/, "");
  try { hash = decodeURIComponent(hash); } catch (e) { hash = ""; }
  var parts = hash.split(".");
  var id = parts[0] || "";
  var key = parts[1] || "";
  var okId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
  var okKey = /^[A-Za-z0-9_-]{20,200}$/.test(key);

  function say(text) { status.textContent = text; }

  function row(label, value) {
    var dt = doc.createElement("dt");
    var dd = doc.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    list.appendChild(dt);
    list.appendChild(dd);
  }

  if (!okId || !okKey) {
    say("This link is incomplete. Open the full link you were given after sending your brief.");
    return;
  }

  var auth = { Authorization: "Bearer " + key, Accept: "application/json" };
  var url = "api/briefs/" + encodeURIComponent(id);

  fetch(url, { headers: auth, credentials: "omit" })
    .then(function (res) {
      if (res.status === 429) { throw new Error("busy"); }
      if (!res.ok) { throw new Error("missing"); }
      return res.json();
    })
    .then(function (brief) {
      var when = new Date(brief.createdAt);
      say(isNaN(when) ? "Received." : "Received on " + when.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) + ".");
      row("Name", String(brief.name || ""));
      row("Reach you at", String(brief.reach || ""));
      row("Services", Array.isArray(brief.need) && brief.need.length ? brief.need.join(", ") : "Not sure yet");
      row("Details", String(brief.about || "None added"));
      if (brief.attachment && fileRow && downloadBtn) {
        row("Attachment", String(brief.attachment.name || "attachment"));
        fileRow.hidden = false;
        downloadBtn.addEventListener("click", function (ev) {
          ev.preventDefault();
          fetch(url + "/attachment", { headers: auth, credentials: "omit" })
            .then(function (res) { if (!res.ok) { throw new Error("file"); } return res.blob(); })
            .then(function (blob) {
              var link = doc.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = String(brief.attachment.name || "attachment").replace(/[^\w. -]/g, "_");
              doc.body.appendChild(link);
              link.click();
              link.remove();
              setTimeout(function () { URL.revokeObjectURL(link.href); }, 4000);
            })
            .catch(function () { say("The attachment could not be downloaded. Try again in a minute."); });
        });
      }
      body.hidden = false;
    })
    .catch(function (err) {
      say(err.message === "busy"
        ? "Too many requests from this connection. Try again later."
        : "No brief was found for this link. It may have been deleted, or the link is not complete.");
    });

  if (deleteBtn) {
    deleteBtn.addEventListener("click", function () {
      if (!window.confirm("Delete this brief and its attachment? This cannot be undone.")) { return; }
      deleteBtn.disabled = true;
      fetch(url, { method: "DELETE", headers: auth, credentials: "omit" })
        .then(function (res) {
          if (res.status !== 204) { throw new Error("delete"); }
          body.hidden = true;
          say("Your brief has been deleted.");
        })
        .catch(function () {
          deleteBtn.disabled = false;
          say("The brief could not be deleted. Try again in a minute.");
        });
    });
  }
})();
