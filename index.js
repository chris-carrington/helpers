const express = require('express')
const jwt = require('jsonwebtoken')
const Webflow = require('webflow-api')
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
const jsonBodyParser = express.json()
const api = new Webflow({ token: process.env.WEBFLOW_API_TOKEN })

async function getUsers () {
  const response = await fetch(`https://api.webflow.com/collections/${ process.env.USERS_COLLECTION_ID }/items`, { headers: api.headers })
  return (await response.json()).items
}

function isEmailInUsersCollection ({ users, email }) {
  const LOWERCASE_EMAIL = email.toLowerCase()
  return users.some(u => u.email.toLowerCase() === LOWERCASE_EMAIL)
}

function isUsernameInUsersCollection ({ users, username }) {
  const LOWERCASE_USER_NAME = username.toLowerCase()
  return users.some(u => u.name.toLowerCase() === LOWERCASE_USER_NAME)
}

function sendSignInEmail (email) {
  return new Promise((resolve, reject) => {
    jwt.sign({ email }, process.env.JWT_PRIVATE_KEY, { expiresIn: '1h' }, (jwtError, token) => {
      if (jwtError) reject(jwtError)
      else {
        const transportOptions = {
          host: 'smtp.mailtrap.io',
          port: 2525,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        }
  
        const transport = nodemailer.createTransport(transportOptions)

        const mailOptions = {
          to: email,
          from: 'support@loveandunderstanding.org',
          subject: 'Sign In To Love & Understanding',
          html: `
            <h1>Sign In To Love & Understanding</h1>
            <a href="http://localhost:3000/verify-sign-in?token=${ token }" target="_blank">Click here to Sign In</a>
          `
        }

        transport.sendMail(mailOptions, (emailError, response) => {
          if (emailError) reject(emailError)
          else resolve(response)
        })
      }
    })
  })
}

app.post('/request-sign-in', jsonBodyParser, async (req, res) => {
  try {
    const users = await getUsers()

    if (isEmailInUsersCollection({ users, email: req.body.email })) {
      sendSignInEmail(req.body.email)
        .then(() => res.send({ success: 'Email Sent' }))
        .catch(error => res.status(400).send({ error: error.message }))
    } else {
      res.status(400).send({ error: 'Email not found' })
    }
  } catch (error) {
    res.status(400).send({ error: error.message })
  }
})

app.post('/sign-up', jsonBodyParser, async (req, res) => {
  try {
    const users = await getUsers()

    if (isEmailInUsersCollection({ users, email: req.body.email })) {
      res.status(400).send({ error: 'Email already active' })
    } else if (isUsernameInUsersCollection({ users, username: req.body.username })) {
      res.status(400).send({ error: 'Username already active' })
    } else {
      const webflowApiResponse = await fetch(`https://api.webflow.com/collections/${ process.env.USERS_COLLECTION_ID }/items`, {
        method: 'POST',
        headers: api.headers,
        body: JSON.stringify({
          "fields": {
            "_archived": false,
            "_draft": false,
            "name": req.body.username,
            "email": req.body.email,
            "first-name": req.body.firstName,
            "last-name": req.body.lastName
          }
        })
      })

      if (webflowApiResponse.status === 200) res.send({ success: 'User added successfully' })
      else res.status(400).send({ error: 'Error adding user' })
    }
  } catch (error) {
    res.status(400).send({ error: error.message })
  }
})

app.get('/', (req, res) => {
  try {
    res.render('index')
  } catch (error) {
    res.status(400).send({ error: error.message })
  }
})

app.get('/verify-sign-in', (req, res) => {
  try {
    jwt.verify(req.query.token, process.env.JWT_PRIVATE_KEY, (jwtError, decoded) => {
      if (jwtError) res.status(400).send({ error: jwtError.message })
      else res.send({ success: decoded.email })
    })
  } catch (error) {
    res.status(400).send({ error: error.message })
  }
})

app.set('views', './views')
app.set('view engine', 'pug')
app.listen(3000)
