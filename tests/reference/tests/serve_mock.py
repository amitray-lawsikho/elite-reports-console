# -*- coding: utf-8 -*-
"""Run the console against the mock data, for looking at it in a browser.

LeadSquared, Ozonetel, the sheets, MCube and Acefone are all faked, so every
button on the Reports page can be pressed."""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import tests.mock_run as mock   # noqa: E402

from services import dialers, pipeline                  # noqa: E402
from services import runs as storage                    # noqa: E402

mock.setup_fakes()
os.environ["OZONETEL_SLEEP_SECONDS"] = "1"


def fake_lsq(job, days, basis=None):
    frame = mock.SNAP
    for page in range(1, 4):
        job.queue.put(f"__COUNT__ {page * 20} {page}")
        job.log(f"Page {page}: 20 leads — {page * 20} so far.")
        time.sleep(0.4)
    token = storage.new_token()
    meta = {"token": token, "days": days, "basis": basis, "basis_label": "Modified On",
            "fetched_at": "2026-09-23T10:00:00",
            "stats": {"rows": len(frame), "tagged": len(frame), "untagged": 0,
                      "zip_intent": 45, "no_last_call": 0, "follow_up": 36,
                      "report_types": {}}, "zip_fields_missing": []}
    storage.save_fetch(token, frame, meta)
    job.log(f"Done — {len(frame)} unique leads.")
    job.result = meta


pipeline.lsq_fetch.run = fake_lsq

import app as application   # noqa: E402

application.mcube_autodialers.fetch_campaigns = lambda: [{"id": "11", "name": "Sales Autodial"}]
application.acefone_lists.fetch_all = lambda: [{"id": "22", "name": "Breached callbacks"}]


def fake_push(job, token, target_id, name, *options):
    frame, _ = dialers.load_file(token, "mcube")
    job.set_total(len(frame))
    job.log(f"(mock) pushing {len(frame)} lead(s) to {name}")
    time.sleep(1)
    job.advance(succeeded=len(frame))
    job.log(f"Done — pushed {len(frame)} lead(s) to {name}.")


from apis.acefone import skills as acefone_skills   # noqa: E402
acefone_skills.fetch_skill_lists = lambda: [{"id": "5", "name": "Sales skills"}]
acefone_skills.fetch_skills = lambda list_id: [{"id": "51", "name": "Priya Singh"},
                                               {"id": "52", "name": "Suhail Showkat"}]
dialers.push_mcube = fake_push
dialers.push_acefone = fake_push

# Sales IQ: a fake Zoho with a handful of chats, in a throwaway database.
import tempfile                                   # noqa: E402
import tests.test_salesiq as fake_siq              # noqa: E402
from services import salesiq                       # noqa: E402
os.environ.update({"ZOHO_CLIENT_ID": "id", "ZOHO_CLIENT_SECRET": "s", "ZOHO_REFRESH_TOKEN": "r"})
salesiq.DB_PATH = os.path.join(tempfile.mkdtemp(), "salesiq.db")
salesiq.access_token = lambda: "tok"
salesiq._get = fake_siq.fake_get
_phones = mock.SNAP["Phone"].tolist()
for i in range(40):
    fake_siq.CONVS[f"m{i}"] = fake_siq.conv(
        f"m{i}", i * 0.11, status="missed" if i % 4 == 0 else "closed",
        source=["LawSikho Website", "Skill Arbitrage", "WhatsApp"][i % 3],
        name=f"Visitor {i % 30}", phone=("+91 " + _phones[i % 30]) if i % 5 else "9" * 10)


def _fake_lsq(job, days, basis=None, keep=True):
    if keep:
        return fake_lsq(job, days, basis)
    job.log(f"(mock) LeadSquared {days} days on Modified On")
    job.result = {"frame": mock.SNAP.copy(), "days": days}


pipeline.lsq_fetch.run = _fake_lsq

port = int(os.environ.get("MOCK_PORT", "5299"))
application.app.run(host="127.0.0.1", port=port, threaded=True, use_reloader=False)
