import { ImageResponse } from 'next/og'

export const alt = "Avishake Adhikary"
export const size = {
  width: 3840,
  height: 2160,
}
 
export const contentType = 'image/png'

// const imageUrl = "/images/gallery/AvishakeAmityMerc.png";
const imageUrl = "https://github.com/AvishakeAdhikary/avishakeadhikary.github.io/blob/main/public/images/gallery/AvishakeAmityMerc.png?raw=true"


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
          backgroundImage: `url("${imageUrl}")`,
          color: 'black',
          fontSize: 128, 
          fontWeight: 'bold', 
        }}
      >
        <div style={{ 
          marginTop: 40,
        }}>
          Avishake Adhikary&apos;s Portfolio
        </div>
        <div style={{ 
          marginTop: 40,
        }}>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
