module.exports = {
    apps: [
      {
        name: 'GPS-tracking-socket-server',
        script: 'index.js',
        env: {
          NODE_ENV: 'production',
        },
        out_file: './logs/gps-server-out.log', // Path for standard output logs
        error_file: './logs/gps-server-error.log', // Path for error logs
        restart_delay: 3000,
        exp_backoff_restart_delay: 100
      },
    ],
  };
  
  