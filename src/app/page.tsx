'use client'

import { Box, Button, Stack, TextField, Typography} from '@mui/material'
import { useState } from 'react'

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      parts:[{ text: "Hi! I'm the Headstarter support assistant. How can I help you today?"}],
    },
  ])
  const [message, setMessage] = useState('')

  const sendMessage = async () => {
    if (!message.trim()) return;  // Don't send empty messages
  
    setMessage('')
    setMessages((messages) => [
      ...messages,
      {
        role: 'user',
        parts:[{ text: message}],
      },
      {
        role: 'model',
        parts:[{ text:''}],
      },
    ])
  
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({history:[...messages],msg:message}),
      })
  
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      if(response.body){
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
    
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          setMessages((messages) => {
            let lastMessage = messages[messages.length - 1]
            console.log('here')
            console.log()
            let otherMessages = messages.slice(0, messages.length - 1)
            return [
              ...otherMessages,
              { ...lastMessage, parts:[ {text:lastMessage.parts[0].text + text },]},
            ]
          })
        }
    }
    } catch (error) {
      console.error('Error:', error)
      setMessages((messages) => [
        ...messages,
        { role: 'model', parts:[{text: "I'm sorry, but I encountered an error. Please try again later."}] },
      ])
    }
  }

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      sx={{
        padding: { xs: 2, sm: 3, md: 4 }, // Responsive padding
      }}
    >
       <Box textAlign="center" mb={4}>
        <Typography variant="h4" component="h1">
          Hello User
        </Typography>
      </Box>
      <Stack
      width={{ xs: '95%', sm: '80%', md: '60%', lg: '50%', xl: '40%' }}
      height={{ xs: '90%', sm: '80%', md: '70%', lg: '60%', xl: '50%' }}
        direction={'column'}
        border="1px solid black"
        p={2}
        spacing={3}
        sx={{
          boxShadow: 3,
          overflowY: 'auto',
          backgroundColor: 'white',
          borderRadius: 2,
          
        }}
      >
        <Stack
          direction={'column'}
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
          sx={{ overflowY: 'auto', maxHeight: '100%' }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'model' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                bgcolor={
                  message.role === 'model'
                    ? 'primary.main'
                    : 'secondary.main'
                }
                color="white"
                borderRadius={16}
                p={3}
                sx={{
                  maxWidth: '75%', // Ensure messages wrap within 75% of the container width
                  wordBreak: 'break-word',
                }}
              >
                {message.parts[0].text}
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction={'row'} spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button variant="contained" onClick={sendMessage}>
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}