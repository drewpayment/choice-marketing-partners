'use client'

import { useState } from 'react'
import { TypeaheadSelect } from '@/components/ui/typeahead-select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Mock agent data similar to what the API would return
const mockAgents = [
  { id: 1, name: 'Daniel Cauffman' },
  { id: 2, name: 'Daniel Gordon' },
  { id: 3, name: 'Daniel Schlabach' },
  { id: 4, name: 'Daniel Tilton' },
  { id: 5, name: 'Danisha Hogan' },
  { id: 6, name: 'Darean Watkins' },
  { id: 7, name: 'Darrell Spiker' },
  { id: 8, name: 'Darrell Watson' },
  { id: 9, name: 'Darshuan Wyrick' },
  { id: 10, name: 'Daton Lewis' },
  { id: 11, name: 'Davendrick Hall' },
  { id: 12, name: 'David Burlison' },
  { id: 13, name: 'David Read' },
  { id: 14, name: 'David Spillman' },
  { id: 15, name: 'David Zuehlke' },
  { id: 16, name: 'Dazzinae Russell' },
  { id: 17, name: 'DeAngelo Garling' },
  { id: 18, name: 'Admin User' },
  { id: 19, name: 'Drew Payment' },
  { id: 20, name: 'Employee User' },
  { id: 21, name: 'Manager User' },
  { id: 22, name: 'John Smith' },
  { id: 23, name: 'Jane Doe' },
  { id: 24, name: 'Mike Johnson' },
  { id: 25, name: 'Sarah Wilson' }
]

export default function TypeaheadSelectDemo() {
  const [selectedAgent, setSelectedAgent] = useState<string | number | undefined>(undefined)
  const [selectedWithDefault, setSelectedWithDefault] = useState<string | number | undefined>('all')

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">TypeaheadSelect Component Demo</h1>
        <p className="text-muted-foreground">
          Demonstrating the new TypeaheadSelect component with filtering and keyboard navigation
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Example */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Agent Selection</CardTitle>
            <CardDescription>
              Select an agent from the dropdown with typeahead filtering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent</label>
              <TypeaheadSelect
                options={mockAgents.map(agent => ({ key: agent.id, value: agent.name }))}
                value={selectedAgent}
                onValueChange={setSelectedAgent}
                placeholder="Select an agent..."
                searchPlaceholder="Type to search agents..."
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Selected: {selectedAgent ? mockAgents.find(a => a.id === selectedAgent)?.name || 'Unknown' : 'None'}
            </div>
          </CardContent>
        </Card>

        {/* With Default Option */}
        <Card>
          <CardHeader>
            <CardTitle>With Default Option</CardTitle>
            <CardDescription>
              Includes an &ldquo;All Agents&rdquo; option for filtering scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Agent</label>
              <TypeaheadSelect
                options={[
                  { key: 'all', value: 'All Agents' },
                  ...mockAgents.map(agent => ({ key: agent.id, value: agent.name }))
                ]}
                value={selectedWithDefault}
                onValueChange={setSelectedWithDefault}
                placeholder="Select filter..."
                searchPlaceholder="Search agents..."
                clearable={false}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Selected: {
                selectedWithDefault === 'all' 
                  ? 'All Agents' 
                  : selectedWithDefault 
                    ? mockAgents.find(a => a.id === selectedWithDefault)?.name || 'Unknown'
                    : 'None'
              }
            </div>
          </CardContent>
        </Card>

        {/* Disabled Example */}
        <Card>
          <CardHeader>
            <CardTitle>Disabled State</CardTitle>
            <CardDescription>
              Component in disabled state for edit mode scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent (Disabled)</label>
              <TypeaheadSelect
                options={mockAgents.map(agent => ({ key: agent.id, value: agent.name }))}
                value={1} // Daniel Cauffman
                onValueChange={() => {}}
                placeholder="Select an agent..."
                disabled={true}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              This field is disabled (common in edit mode)
            </div>
          </CardContent>
        </Card>

        {/* Small Size Example */}
        <Card>
          <CardHeader>
            <CardTitle>Small Size Variant</CardTitle>
            <CardDescription>
              Compact version for space-constrained layouts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent (Small)</label>
              <TypeaheadSelect
                options={mockAgents.slice(0, 10).map(agent => ({ key: agent.id, value: agent.name }))}
                value={undefined}
                onValueChange={() => {}}
                placeholder="Select..."
                size="sm"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Smaller height for compact layouts
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Keyboard Navigation:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Enter</kbd> or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Space</kbd> to open dropdown</li>
              <li>Use <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">↑</kbd><kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">↓</kbd> arrows to navigate options</li>
              <li>Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Enter</kbd> to select highlighted option</li>
              <li>Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Escape</kbd> to close dropdown</li>
              <li>Type to filter options dynamically</li>
            </ul>
            <p className="mt-4"><strong>Features:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Real-time filtering as you type</li>
              <li>Keyboard navigation support</li>
              <li>Clear button for easy reset</li>
              <li>Consistent styling with shadcn/ui components</li>
              <li>Accessible ARIA attributes</li>
              <li>Support for disabled and size variants</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}