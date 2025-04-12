#!/bin/bash

set -e

cd $(dirname $0)

npm run build
rsync -a --exclude build/data.json build/ aa2tr@aa2tr.org:~/whatsup/root
rsync -a update.py aa2tr@aa2tr.org:~/whatsup/update.py
