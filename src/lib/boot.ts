import fs from 'fs'
import users from '@config/users.json'

function boot ():void {
  users.forEach(user => {
    if (!fs.existsSync(`home/${user.username}`)) fs.mkdirSync(`home/${user.username}`, { recursive: true })
  })
}

export { boot }
