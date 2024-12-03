'use client'

import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useAuth } from '../authcontext';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'user',
      content: [{ text: "Hello" }],
    },
    {
      role: 'assistant',
      content: [{ text: "Hi! I'm the Olympics Data support assistant. How can I help you today?" }],
    },
  ])
  const [message, setMessage] = useState('')
  const {user,logout} = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const msgEndRef: any = useRef(null);

  const scrollToBottom = () => {
    if (msgEndRef.current)
      msgEndRef.current.scrollIntoView({ behavior: "smooth" })
  }
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  const sendMessage = async () => {
    if (!message.trim()) return;  // Don't send empty messages
    setIsLoading(true);

    setMessage('')
    setMessages((messages) => [
      ...messages,
      {
        role: 'user',
        content: [{ text: message }],
      },
      {
        role: 'assistant',
        content: [{ text: '' }],
      },
    ])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        //body: JSON.stringify([...messages, { role: 'user', content: [{ text: message }] }]),
        body: JSON.stringify({text:message}),
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          setMessages((messages) => {
            let lastMessage = messages[messages.length - 1]
            let otherMessages = messages.slice(0, messages.length - 1)
            setIsLoading(false)
            return [
              ...otherMessages,
              { ...lastMessage, content: [{ text: lastMessage.content[0].text + text },] },
            ]
          })
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages((messages) => [
        ...messages,
        { role: 'assistant', content: [{ text: "I'm sorry, but I encountered an error. Please try again later." }] },
      ])
      setIsLoading(false)
    }
  }
  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
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
        <SupportAgentIcon></SupportAgentIcon><span>Welcome,I am Astra! Your personalized AI assistant</span>
        <Typography variant="h4" component="h1">
            Hello {user?.displayName}
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
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                bgcolor={
                  message.role === 'assistant'
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
                {message.content[0].text}
              </Box>
            </Box>
          ))}
          <div ref={msgEndRef} />
        </Stack>
        <Stack direction={'row'} spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button variant="contained"
            onClick={sendMessage}
            disabled={isLoading}
          >
            {isLoading ? 'Sending....' : 'Send'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}