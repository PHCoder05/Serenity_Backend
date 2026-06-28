#!/usr/bin/env bash
set -e

/opt/wait-for-it.sh postgres:5432
/opt/wait-for-it.sh maildev:1080
/opt/wait-for-it.sh petpooja-mock:3999
npm install
npm run migration:run
npm run seed:run:relational
npm run start:dev
