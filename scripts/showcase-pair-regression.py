"""Prepare an actual operator-approved pair in disposable local storage only."""
import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

if os.environ.get('BEATZUCKER_ISOLATED_QA') != '1':
    raise RuntimeError('Requires isolated QA flag')
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))
import showcase_prepare as showcase
parser = argparse.ArgumentParser()
parser.add_argument('--original',required=True)
parser.add_argument('--master',required=True)
parser.add_argument('--start',required=True,type=float)
args = parser.parse_args()
folder = ROOT/'validation-output'/'showcase-alignment'
folder.mkdir(parents=True,exist_ok=True)
paths = [Path(args.original).resolve(strict=True),Path(args.master).resolve(strict=True)]
before = [(p.stat().st_size,p.stat().st_mtime_ns) for p in paths]
with tempfile.TemporaryDirectory(prefix='pair-',dir=folder) as output:
    os.environ['SHOWCASE_STORAGE_DIR'] = output
    result = showcase.prepare_showcase(*paths,args.start,'98765432-1234-4567-89ab-123456789abc')
    assert all(23.9<result[side]['duration']<24.2 for side in ('original','master'))
    assert len(list(Path(output).glob('*.mp3'))) == 2
    assert before == [(p.stat().st_size,p.stat().st_mtime_ns) for p in paths]
    print(json.dumps({'ok':True,'start':args.start,'duration':result['duration'],
        'original':result['original']['metrics'],'master':result['master']['metrics'],
        'sourceFilesUnchanged':True}))
