// app/components/reception/RoomFilters.tsx
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building } from 'lucide-react';

interface RoomFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedFloor: string;
  setSelectedFloor: (value: string) => void;
  uniqueFloors: number[];
}

export function RoomFilters({ 
  searchTerm, 
  setSearchTerm, 
  selectedFloor, 
  setSelectedFloor, 
  uniqueFloors 
}: RoomFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar habitación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <div className="w-full sm:w-48">
        <Select value={selectedFloor} onValueChange={setSelectedFloor}>
          <SelectTrigger>
            <Building className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Seleccionar piso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los pisos</SelectItem>
            {uniqueFloors.map(floor => (
              <SelectItem key={floor} value={floor.toString()}>
                Piso {floor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}