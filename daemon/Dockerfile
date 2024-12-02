FROM keymetrics/pm2:16-alpine

# Bundle APP files
COPY daemons/SendOrders.js daemons/SendOrders.js
COPY package.json .
COPY ecosystem.config.js .

# Install app dependencies
ENV NPM_CONFIG_LOGLEVEL warn
RUN npm install --production
#RUN npm audit fix

# Expose the listening port of your app
#EXPOSE 8000

# Show current folder structure in logs
# RUN ls -al -R

CMD [ "pm2-runtime", "start", "ecosystem.config.js" ]

##########################
# Build the docker image
#sudo docker build . -t dynamicstrategiesio/general:cardgateway_testnet_daemon
#sudo docker push dynamicstrategiesio/general:cardgateway_testnet_daemon

##########################
# Create Docker Container
##########################
#sudo docker run -it dynamicstrategiesio/general:cardgateway_testnet_daemon

###########
# Monitor
###########
# sudo docker exec -it 5bdea94ddf93 sh
# pm2 monit
