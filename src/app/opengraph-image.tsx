import { ImageResponse } from 'next/og'

export const alt = "About Avishake"
export const size = {
  width: 3840,
  height: 2160,
}
 
export const contentType = 'image/png'

const imageUrl = "/images/gallery/AvishakeAmityMerc.png"; // Relative URL to the image in your public folder

export default function Image() {
  return new ImageResponse(
    (
      <div 
        style={{ 
          height: '100%', 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'black',
          color: 'white',
          fontSize: 128, 
          fontWeight: 'bold', 
        }}
      >
        <img src='https://github.com/AvishakeAdhikary/avishakeadhikary.github.io/blob/main/public/images/gallery/AvishakeAmityMerc.png?raw=true' 
            style={{borderRadius: '50%' }} 
            height={1024} width={1024}/>
        <div style={{ 
          marginTop: 40,
        }}>
          Avishake Adhikary&apos;s Portfolio
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
