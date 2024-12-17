'use client'

import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useAuth } from '../authcontext';
import mime from 'mime';
import ReactMarkdown from 'react-markdown'
import ReactMarkdown from 'react-markdown'



type MessageContent = {
  text: string;
  image?: string|null; // The image is optional
};

type Message = {
  role: "user" | "assistant"; // Role is either 'user' or 'assistant'
  content: MessageContent[]; // Content is an array of MessageContent
};
export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);
  const[mimeType, setmimeType] = useState<string | null>('');


  const convertImageToBase64 = (file:any) : Promise<string> => {
    setmimeType(file.type);
   
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]); // Get Base64 string without "data:image/*;base64,"
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  
  const handleFileUpload = async (event:any) => {
    const file = event.target.files[0]; // Get the selected file
    if (file) {
      try {
        console.log('enetered')
        const base64 = await convertImageToBase64(file);
        setUploadedImage(base64); // Save Base64 image data to state
        const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setUploadedFilePreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error converting image to Base64:', error);
      }
    }
  };


  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'user',
      content: [{ text: "Hello",image:null }],
    },
    {
      role: 'assistant',
      content: [{ text: "Hi! I'm the Tableau Report Analysing assistant. How can I help you today?"}],
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
    if (!message.trim() && !uploadedImage) return;  // Don't send empty messages
    setIsLoading(true);
    setMessages((messages) => [
      ...messages,
      {
        role: 'user',
        content: [{ text: message,image:uploadedFilePreview}],
      },
      {
        role: 'assistant',
        content: [{ text: '' }],
      },
    ])
    setMessage('')
    setUploadedFilePreview('')
    try {
      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        //body: JSON.stringify([...messages, { role: 'user', content: [{ text: message }] }]),
        body: JSON.stringify({text:message,image : uploadedImage,mimeType : mimeType}),
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
    <SupportAgentIcon />
    <span>Welcome, I am Your personalized AI assistant</span>
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
          justifyContent={message.role === 'assistant' ? 'flex-start' : 'flex-end'}
        >
          <Box
            bgcolor={message.role === 'assistant' ? 'primary.main' : 'secondary.main'}
            color="white"
            borderRadius={16}
            p={3}
            sx={{
              maxWidth: '75%', // Ensure messages wrap within 75% of the container width
              wordBreak: 'break-word',
            }}
          >
            <ReactMarkdown>{message.content[0].text}</ReactMarkdown>
            {message.content[0].image && (
              <Box component="img" src={message.content[0].image} alt="Uploaded Preview" sx={{ maxWidth: '100%', height: 'auto', marginTop: '10px', borderRadius: '8px' }} />
            )}
          </Box>
        </Box>
      ))}
      <div ref={msgEndRef} />
    </Stack>
    <Stack direction={'row'} spacing={2}>
      {/* Input Field with Image Preview */}
      <Box sx={{ position: 'relative', width: '100%' }}>
        {uploadedFilePreview && (
          <Box
            component="img"
            src={uploadedFilePreview}
            alt="Uploaded Preview"
            sx={{
              width: '100%',
              maxHeight: '150px',
              objectFit: 'contain',
              marginBottom: '0.5rem',
              borderRadius: '8px',
            }}
          />
        )}
        <TextField
          label="Message"
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          multiline
          rows={uploadedFilePreview ? 2 : 5} // Adjust height based on image presence
        />
      </Box>

      {/* Upload Image Button */}
      <Button
        variant="contained"
        component="label"
      >
        Upload Image
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileUpload}
        />
      </Button>

      {/* Send Button */}
      <Button variant="contained" onClick={sendMessage} disabled={isLoading}>
        {isLoading ? 'Sending....' : 'Send'}
      </Button>
    </Stack>
  </Stack>
</Box>

  )
}
