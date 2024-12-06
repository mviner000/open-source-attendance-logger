"use client";

import { useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Paintbrush, Code, FileText, CheckSquare, Database } from 'lucide-react'
import MelvinQuotes from './MelvinQuotes';

type Member = {
  name: string
  avatar: string
}

type CardData = {
  id: string
  title: string
  description: string
  assignedTo: Member[]
  progress: number
  updatedDate: string
  checkedBy: string
  updatedBy: string
  details: string[]
}

const TaskCard = ({ data, type }: { data: CardData; type: 'design' | 'code' | 'doc' | 'qa' | 'db' | 'back'; href: string }) => {
  const [isOpen, setIsOpen] = useState(false)

  const getIcon = () => {
    switch (type) {
      case 'design': return <Paintbrush className="h-6 w-6 text-purple-500" />
      case 'code': return <Code className="h-6 w-6 text-blue-500" />
      case 'doc': return <FileText className="h-6 w-6 text-green-500" />
      case 'qa': return <CheckSquare className="h-6 w-6 text-red-500" />
      case 'db': return <Database className="h-6 w-6 text-yellow-500" />
    }
  }

  return (
    <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">{data.title}</CardTitle>
            {getIcon()}
          </div>
          <CardDescription>{data.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <span className="text-sm font-medium mr-2">Assigned to:</span>
            <div className="flex -space-x-2">
              {data.assignedTo.map((member, index) => (
                <Avatar key={index} className="border-2 border-background">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{data.progress}%</span>
            </div>
            <Progress value={data.progress} className="w-full" />
          </div>
        </CardContent>
        <div className="text-sm text-muted-foreground px-6">
          <p className='hidden'>Updated: {data.updatedDate}</p>
          <p>Checked by: {data.checkedBy}</p>
          <p>Updated by: {data.updatedBy}</p>
        </div>
      <CardFooter className="flex flex-col items-start">
        <Accordion type="single" collapsible className="w-full mt-4">
          <AccordionItem value="details">
            <AccordionTrigger
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between w-full"
            >
              <span>View Details</span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc list-inside">
                {data.details.map((detail, index) => (
                  <li key={index} className="text-sm">{detail}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardFooter>
    </Card>
  )
}


export default function About() {
  const cardsData: { data: CardData; type: 'design' | 'code' | 'doc' | 'qa' | 'db' | 'back'; href: string }[] = [
    {
      data: {
        id: '1',
        title: 'Frontend UI Designer',
        description: 'Revamp the company website with a modern look',
        assignedTo: [
          { name: 'Mack Rafanan', avatar: '/team/rafanan.jpg' },
        ],
        progress: 100,
        updatedDate: '2023-05-15',
        checkedBy: 'John Esternon',
        updatedBy: 'Mack Rafanan',
        details: [
          'Define the color palette',
          'Design responsive layouts',
          'Prepare mockups for client review',
        ],
      },
      type: 'design',
      href: '/settings/designer'
    },
    {
      data: {
        id: '2',
        title: 'Frontend Development',
        description: 'Develop frontend this new website',
        assignedTo: [
          { name: 'Maverick Rosales', avatar: '/team/rosales.jpg' },
          { name: 'John Esternon', avatar: '/team/esternon.jpg' },
        ],
        progress: 100,
        updatedDate: '2023-05-14',
        checkedBy: 'John Esternon',
        updatedBy: 'Maverick Rosales, John Esternon',
        details: [
          'Use codes to make the website amazing',
        ],
      },
      type: 'code',
      href: 'settings/frontend'
    },
    {
      data: {
        id: '3',
        title: 'Document and Manuals',
        description: 'Create comprehensive user manual for the new software',
        assignedTo: [
          { name: 'Stephanie Cruz', avatar: '/team/cruz.jpg' },
          { name: 'Edwardson Mangahas', avatar: '/team/mangahas.jpg' },
        ],
        progress: 90,
        updatedDate: '2023-05-16',
        checkedBy: 'John Esternon',
        updatedBy: 'Stephanie Cruz, Edwardson Mangahas',
        details: [
          'Outline manual structure',
          'Write installation guide',
          'Document all features',
        ],
      },
      type: 'doc',
      href: '/documentation'
    },
    {
      data: {
        id: '4',
        title: 'Quality Assurance Tester',
        description: 'Perform thorough testing of the new software release',
        assignedTo: [
          { name: 'Emmanuel Sulit', avatar: '/team/sulit.jpg' },
          { name: 'Rainier Maglaque', avatar: '/team/maglaque.jpg' },
        ],
        progress: 90,
        updatedDate: '2023-05-17',
        checkedBy: 'John Esternon ',
        updatedBy: 'Emmanuel Sulit, Rainier Maglaque',
        details: [
          'Create test plans',
          'Execute functional tests',
          'Perform regression testing',
          'Report and track bugs',
          'Validate bug fixes',
        ],
      },
      type: 'qa',
      href: '/qa'
    },
    {
      data: {
        id: '5',
        title: 'Database Administrator',
        description: 'Optimize database performance for improved app speed',
        assignedTo: [
          { name: 'Melvin Nogoy', avatar: '/team/nogoy.jpg' },
        ],
        progress: 90,
        updatedDate: '2023-05-18',
        checkedBy: 'John Esternon',
        updatedBy: 'Melvin Nogoy',
        details: [
          'Analyze current database performance',
          'Identify bottlenecks',
          'Optimize database queries',
          'Implement indexing strategies',
          'Monitor and fine-tune performance',
        ],
      },
      type: 'db',
      href: '/database'
    },
    {
      data: {
        id: '6',
        title: 'Backend Developer',
        description: 'Design user interface for the new mobile application',
        assignedTo: [
          { name: 'Melvin Nogoy', avatar: '/team/nogoy.jpg' },
        ],
        progress: 85,
        updatedDate: '2023-05-19',
        checkedBy: 'John Esternon',
        updatedBy: 'Melvin Nogoy',
        details: [
          'Create wireframes',
          'Design UI components',
          'Develop color scheme',
          'Create interactive prototypes',
          'Conduct user testing',
        ],
      },
      type: 'back',
      href: '/backend'
    },
  ]

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cardsData.map((card) => (
          <div className="flex flex-col">
            <TaskCard 
              data={card.data} 
              type={card.type} 
              href={card.href}
            />
          </div>
        ))}
      </div>
      <div className='pt-10'>
        <MelvinQuotes />
      </div>
    </div>
  )
}