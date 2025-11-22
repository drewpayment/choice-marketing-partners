import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

interface Agent {
  name: string
  image: string
  rotation?: number
}

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json()
    const hostedURL = 'https://dl.dropboxusercontent.com/s/'

    let agents: Agent[] = []
    let title: string = ''

    switch(id) {
      case 4000:
        agents = [
          { name: 'James N', image: hostedURL + 'cttfhld33lq8cm4/JamesN.jpg?dl=0' },
          { name: 'Tony R', image: hostedURL + 'TonyR.jpg' }
        ]
        title = '$4,000+'
        break
      case 3000:
        agents = [
          { name: 'Tiffany Rider', image: '/images/camera/tiffany_rider_102018.JPG' },
          { name: 'Tony R', image: hostedURL + 'TonyR.jpg' },
          { name: 'James G', image: hostedURL + '8boosu6s7nmxsm1/JamesG.jpg?dl=0' },
          { name: 'James N', image: hostedURL + 'cttfhld33lq8cm4/JamesN.jpg?dl=0' },
          { name: 'Stanley G', image: hostedURL + 'StanleyG.jpg' },
          { name: 'Ron S', image: hostedURL + '4d1g2wgwj4c479x/RonaldS.jpeg?dl=0' },
          { name: 'Damien J', image: hostedURL + '27uovt5l33i9usw/DamienJ.JPG?dl=0', rotation: 90 }
        ]
        title = '$3,000'
        break
      case 2000:
        agents = [
          { name: 'Tiffany R', image: '/images/camera/tiffany_rider_20180825.JPG' },
          { name: 'Tony R', image: hostedURL + 'TonyR.jpg' },
          { name: 'James G', image: hostedURL + '8boosu6s7nmxsm1/JamesG.jpg?dl=0' },
          { name: 'James N', image: hostedURL + 'cttfhld33lq8cm4/JamesN.jpg?dl=0' },
          { name: 'Stanley G', image: hostedURL + 'StanleyG.jpg' },
          { name: 'Leon J', image: hostedURL + 'LeonJ.jpg' },
          { name: 'Ron S', image: hostedURL + '4d1g2wgwj4c479x/RonaldS.jpeg?dl=0' },
          { name: 'Aaron K', image: hostedURL + 'stm62npvvdvpjzo/AaronK.jpg?dl=0' },
          { name: 'Damien J', image: hostedURL + '27uovt5l33i9usw/DamienJ.JPG?dl=0', rotation: 90 },
          { name: 'Matt S', image: hostedURL + '2bxi2c3gauxe0j8/MathewS.jpg?dl=0' }
        ]
        title = '$2,000'
        break
      case 1000:
        agents = [
          { name: 'Donald Carter Jr.', image: '/images/camera/donald_carter_jr_102018.JPG' },
          { name: 'Tony R', image: hostedURL + 'TonyR.jpg' },
          { name: 'James G', image: hostedURL + '8boosu6s7nmxsm1/JamesG.jpg?dl=0' },
          { name: 'James N', image: hostedURL + 'cttfhld33lq8cm4/JamesN.jpg?dl=0' },
          { name: 'Stanley G', image: hostedURL + 'StanleyG.jpg' },
          { name: 'Ceciel L', image: hostedURL + 'CecielL.jpg' },
          { name: 'Greg H', image: hostedURL + 'GregH.jpg' },
          { name: 'Leon J', image: hostedURL + 'LeonJ.jpg' },
          { name: 'Sarah P', image: hostedURL + 'SarahP.jpg' },
          { name: 'Toni L', image: hostedURL + 'vbrpc0p812u1ccc/ToniL.png?dl=0' },
          { name: 'Tina B', image: hostedURL + 'TinaB.jpg' },
          { name: 'Ron S', image: hostedURL + '4d1g2wgwj4c479x/RonaldS.jpeg?dl=0' },
          { name: 'Aaron K', image: hostedURL + 'stm62npvvdvpjzo/AaronK.jpg?dl=0' },
          { name: 'April P', image: hostedURL + '6sgwmx4u2b1dys0/AprilP.jpg?dl=0' },
          { name: 'Damien J', image: hostedURL + '27uovt5l33i9usw/DamienJ.JPG?dl=0', rotation: 90 },
          { name: 'Josh T', image: hostedURL + '28ggzit3nrxbiz5/JoshuaT.png?dl=0' },
          { name: 'Matt S', image: hostedURL + '2bxi2c3gauxe0j8/MathewS.jpg?dl=0' },
          { name: 'Tyler T', image: hostedURL + 'lqauohqux28stk7/TylerT.jpg?dl=0' }
        ]
        title = '$1,000'
        break
      default:
        agents = [
          { name: 'Sarah B', image: hostedURL + 'SarahB.jpg' },
          { name: 'Tony R', image: hostedURL + 'TonyR.jpg' },
          { name: 'James G', image: hostedURL + '8boosu6s7nmxsm1/JamesG.jpg?dl=0' },
          { name: 'James N', image: hostedURL + 'cttfhld33lq8cm4/JamesN.jpg?dl=0' },
          { name: 'James L', image: hostedURL + 'vadxr0yp0274w1u/JamesL.jpeg?dl=0' },
          { name: 'Stanley G', image: hostedURL + 'StanleyG.jpg' },
          { name: 'Ceciel L', image: hostedURL + 'CecielL.jpg' },
          { name: 'Greg H', image: hostedURL + 'GregH.jpg' },
          { name: 'Leon J', image: hostedURL + 'LeonJ.jpg' },
          { name: 'Sarah P', image: hostedURL + 'SarahP.jpg' },
          { name: 'Toni L', image: hostedURL + 'vbrpc0p812u1ccc/ToniL.png?dl=0' },
          { name: 'Tina B', image: hostedURL + 'TinaB.jpgs' },
          { name: 'Ron S', image: hostedURL + '4d1g2wgwj4c479x/RonaldS.jpeg?dl=0' },
          { name: 'Aaron K', image: hostedURL + 'stm62npvvdvpjzo/AaronK.jpg?dl=0' },
          { name: 'April P', image: hostedURL + '6sgwmx4u2b1dys0/AprilP.jpg?dl=0' },
          { name: 'Damien J', image: hostedURL + '27uovt5l33i9usw/DamienJ.JPG?dl=0', rotation: 90 },
          { name: 'Josh T', image: hostedURL + '28ggzit3nrxbiz5/JoshuaT.png?dl=0' },
          { name: 'Matt S', image: hostedURL + '2bxi2c3gauxe0j8/MathewS.jpg?dl=0' },
          { name: 'Chris S', image: hostedURL + 'rz6talgzazwjy2g/ChrisS.jpg?dl=0' },
          { name: 'Devion S', image: hostedURL + 'detyzix6ig7s2zs/DevionS.jpg?dl=0' },
          { name: 'Jeff L', image: hostedURL + '9v4kwacde590l5n/JeffreyL.jpg?dl=0' },
          { name: 'Nancy A', image: hostedURL + 'NancyA.jpg' },
          { name: 'Torrey W', image: hostedURL + 'TorreyW.jpg' },
          { name: 'Tracy C', image: hostedURL + 'hwy8pck1t6c7slp/TracyC.jpg?dl=0' },
          { name: 'Tyler G', image: hostedURL + 'vp57n3uq1fc77ns/TylerG.jpg?dl=0' },
          { name: 'Tyler H', image: hostedURL + 'vp57n3uq1fc77ns/TylerG.jpg?dl=0' },
          { name: 'Tyler T', image: hostedURL + 'lqauohqux28stk7/TylerT.jpg?dl=0' }
        ]
        title = '$500'
        break
    }

    return NextResponse.json({ agents, title })
  } catch (error) {
    logger.error('Error in comma club API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
