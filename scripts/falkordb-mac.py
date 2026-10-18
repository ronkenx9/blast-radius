"""Local persistent FalkorDB for macOS. Install falkordblite in .falkordb/venv first."""
import os
import signal
import threading
from pathlib import Path
from redislite.falkordb_client import FalkorDB

root = Path(__file__).resolve().parents[1] / '.falkordb'
root.mkdir(exist_ok=True)
port = int(os.environ.get('FALKORDB_PORT', '6389'))
db = FalkorDB(str(root / 'blast-radius.rdb'), serverconfig={
    'port': str(port), 'bind': '127.0.0.1', 'save': '60 1',
})
assert db.client.ping()
assert db.select_graph('blast_radius').query('RETURN 1').result_set == [[1]]
print(f'FalkorDB ready on 127.0.0.1:{port}', flush=True)
stop = threading.Event()
for sig in (signal.SIGINT, signal.SIGTERM):
    signal.signal(sig, lambda *_: stop.set())
try:
    stop.wait()
finally:
    db.client.save()
    db.close()
