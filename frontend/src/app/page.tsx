'use client'

import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { signInWithPopup, signOut} from 'firebase/auth';
import { auth, provider } from './firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from './authcontext';
import Image from 'next/image';
import { grey } from '@mui/material/colors';

export default function Home() {
  const router = useRouter();
  const { user,logout} = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const msgEndRef: any = useRef(null);

  const scrollToBottom = () => {
    if (msgEndRef.current)
      msgEndRef.current.scrollIntoView({ behavior: "smooth" })
  }
  useEffect(() => {
    if (user) {
      router.push('/home');
    }
  }, [user, router]);
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true)
      const result = await signInWithPopup(auth, provider);
      // console.log(result);
      // assignUser(result?.user);
      setIsLoading(false)
      router.push('/home');
    } catch (error) {
      console.error("Error signing in: ", error);
    }
  };
  
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
      <Image
        fill
        src="/images/ai.jpg"
        alt="Image alt"
        style={{ objectFit: "cover"}}
      />
      <div style={{backgroundColor: "#57368e80", zIndex: 100, borderRadius: 50}}>
        <Box textAlign="center" m={4}>
          <SupportAgentIcon></SupportAgentIcon><Typography variant="h4" component="h1">
              Astra
            </Typography>
          <Typography variant="h5" component="h1" mt={5}>
              Welcome
            </Typography>
            <Stack spacing={2} mt={2}
              alignItems="center" 
              sx={{ width: 'auto' }}
              >
                <Button variant="contained"
                  onClick={signInWithGoogle}
                  disabled={isLoading}
                  sx={{ width: 'auto', padding: '8px 16px' }}
                >
                  {isLoading ? 'Signing in....' : 'Sign in with Google'}
                </Button>
            </Stack>
        </Box>
        
      </div>
      
    </Box>
  )
}