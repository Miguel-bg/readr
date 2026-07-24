module.exports = {
  apps: [{
    name: 'readr',
    script: 'npm',
    args: 'run start',
    cwd: '/home/user/webapp',
    env: { NODE_ENV: 'production', PORT: 3000 },
    watch: false,
    instances: 1,
    exec_mode: 'fork',
  }],
}
