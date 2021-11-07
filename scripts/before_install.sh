#!/bin/bash

# download nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
. ~/.nvm/nvm.sh

# download node
nvm install node

# create node directory if it does not exist
DIR=/home/ec2-user/love-and-understanding
if [ -d "$DIR" ]; then
  echo "${DIR} exists"
else
  echo "Creating ${DIR} directory
  mkdir ${DIR}
fi
