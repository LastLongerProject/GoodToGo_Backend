#!/bin/bash
rsync -ravze 'ssh -i ~/.ssh/GoodToGo.pem' apidoc/* ubuntu@master.goodtogo.tw:~/ApiDoc