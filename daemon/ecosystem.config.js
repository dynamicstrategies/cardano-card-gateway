module.exports = {
  apps : [
      {
        name: 'sendtickets',
        script: './daemons/SendOrders.js',
        max_memory_restart: '200M'
      },
      // {
      //   name: 'utxocount',
      //   script: './daemons/UtxoCount.js',
      //   max_memory_restart: '200M'
      // },

  ],

};
