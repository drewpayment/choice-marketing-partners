'use client'

import { useState } from 'react'

interface CommaClubModalProps {
  amount: number
  className?: string
}

interface Agent {
  name: string
  image: string
  rotation?: number
}

export default function CommaClubModal({ amount, className }: CommaClubModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const openModal = async () => {
    setLoading(true)
    setIsOpen(true)
    
    try {
      const response = await fetch('/api/comma-club', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: amount }),
      })
      
      const data = await response.json()
      setAgents(data.agents)
      setTitle(data.title)
    } catch (error) {
      console.error('Error fetching comma club data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={openModal} className={className}>
        ${amount.toLocaleString()}{amount === 4000 ? '+' : ''}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl max-h-[80vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Weekly Comma Club - {title}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {agents.map((agent, index) => (
                  <div key={index} className="text-center">
                    <div className="mb-2">
                      <img
                        src={agent.image}
                        alt={agent.name}
                        className="w-24 h-24 rounded-full mx-auto object-cover shadow-lg"
                        style={agent.rotation ? { transform: `rotate(${agent.rotation}deg)` } : {}}
                      />
                    </div>
                    <p className="font-semibold text-gray-900">{agent.name}</p>
                  </div>
                ))}
              </div>
            )}

            {!loading && agents.length === 0 && (
              <p className="text-center text-gray-600">No agents found for this tier.</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
