import { useState } from 'react'
import { 
  Star,
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Anchor,
  Aperture,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  AtSign,
  Award,
  BarChart,
  Battery,
  Bell,
  Bluetooth,
  Bold,
  Book,
  Bookmark,
  Box,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  CheckSquare,
  Circle,
  Clock,
  Cloud,
  Code,
  Coffee,
  Command,
  Compass,
  Copy,
  Cpu,
  CreditCard,
  Delete,
  Download,
  Edit,
  Eye,
  Facebook,
  File,
  Filter,
  Flag,
  Folder,
  Github,
  Globe,
  Grid,
  Hash,
  Headphones,
  Heart,
  Home,
  Image,
  Inbox,
  Info,
  Instagram,
  Key,
  Layers,
  Layout,
  Link,
  List,
  Lock,
  LogIn,
  Mail,
  Map,
  MapPin,
  Maximize,
  Menu,
  MessageCircle,
  MessageSquare,
  Mic,
  Minimize,
  Monitor,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Move,
  Music,
  Package,
  Paperclip,
  Pause,
  Phone,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Share,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Shuffle,
  Sidebar,
  Slash,
  Smartphone,
  Sun,
  Tablet,
  Tag,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Trash,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Twitter,
  User,
  Users,
  Video,
  Volume,
  Wifi,
  X,
  XCircle,
  XSquare,
  Youtube,
  Zap,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

// Create an array of all available icons
const AVAILABLE_ICONS = [
  { name: 'star', icon: Star },
  { name: 'activity', icon: Activity },
  { name: 'alert-circle', icon: AlertCircle },
  { name: 'alert-octagon', icon: AlertOctagon },
  { name: 'alert-triangle', icon: AlertTriangle },
  { name: 'align-center', icon: AlignCenter },
  { name: 'align-justify', icon: AlignJustify },
  { name: 'align-left', icon: AlignLeft },
  { name: 'align-right', icon: AlignRight },
  { name: 'anchor', icon: Anchor },
  { name: 'aperture', icon: Aperture },
  { name: 'archive', icon: Archive },
  { name: 'arrow-down', icon: ArrowDown },
  { name: 'arrow-left', icon: ArrowLeft },
  { name: 'arrow-right', icon: ArrowRight },
  { name: 'arrow-up', icon: ArrowUp },
  { name: 'at-sign', icon: AtSign },
  { name: 'award', icon: Award },
  { name: 'bar-chart', icon: BarChart },
  { name: 'battery', icon: Battery },
  { name: 'bell', icon: Bell },
  { name: 'bluetooth', icon: Bluetooth },
  { name: 'bold', icon: Bold },
  { name: 'book', icon: Book },
  { name: 'bookmark', icon: Bookmark },
  { name: 'box', icon: Box },
  { name: 'briefcase', icon: Briefcase },
  { name: 'calendar', icon: Calendar },
  { name: 'camera', icon: Camera },
  { name: 'check', icon: Check },
  { name: 'check-circle', icon: CheckCircle },
  { name: 'check-square', icon: CheckSquare },
  { name: 'circle', icon: Circle },
  { name: 'clock', icon: Clock },
  { name: 'cloud', icon: Cloud },
  { name: 'code', icon: Code },
  { name: 'coffee', icon: Coffee },
  { name: 'command', icon: Command },
  { name: 'compass', icon: Compass },
  { name: 'copy', icon: Copy },
  { name: 'cpu', icon: Cpu },
  { name: 'credit-card', icon: CreditCard },
  { name: 'delete', icon: Delete },
  { name: 'download', icon: Download },
  { name: 'edit', icon: Edit },
  { name: 'eye', icon: Eye },
  { name: 'facebook', icon: Facebook },
  { name: 'file', icon: File },
  { name: 'filter', icon: Filter },
  { name: 'flag', icon: Flag },
  { name: 'folder', icon: Folder },
  { name: 'github', icon: Github },
  { name: 'globe', icon: Globe },
  { name: 'grid', icon: Grid },
  { name: 'hash', icon: Hash },
  { name: 'headphones', icon: Headphones },
  { name: 'heart', icon: Heart },
  { name: 'home', icon: Home },
  { name: 'image', icon: Image },
  { name: 'inbox', icon: Inbox },
  { name: 'info', icon: Info },
  { name: 'instagram', icon: Instagram },
  { name: 'key', icon: Key },
  { name: 'layers', icon: Layers },
  { name: 'layout', icon: Layout },
  { name: 'link', icon: Link },
  { name: 'list', icon: List },
  { name: 'lock', icon: Lock },
  { name: 'log-in', icon: LogIn },
  { name: 'mail', icon: Mail },
  { name: 'map', icon: Map },
  { name: 'map-pin', icon: MapPin },
  { name: 'maximize', icon: Maximize },
  { name: 'menu', icon: Menu },
  { name: 'message-circle', icon: MessageCircle },
  { name: 'message-square', icon: MessageSquare },
  { name: 'mic', icon: Mic },
  { name: 'minimize', icon: Minimize },
  { name: 'monitor', icon: Monitor },
  { name: 'moon', icon: Moon },
  { name: 'more-horizontal', icon: MoreHorizontal },
  { name: 'more-vertical', icon: MoreVertical },
  { name: 'move', icon: Move },
  { name: 'music', icon: Music },
  { name: 'package', icon: Package },
  { name: 'paperclip', icon: Paperclip },
  { name: 'pause', icon: Pause },
  { name: 'phone', icon: Phone },
  { name: 'play', icon: Play },
  { name: 'plus', icon: Plus },
  { name: 'printer', icon: Printer },
  { name: 'refresh-cw', icon: RefreshCw },
  { name: 'save', icon: Save },
  { name: 'search', icon: Search },
  { name: 'send', icon: Send },
  { name: 'settings', icon: Settings },
  { name: 'share', icon: Share },
  { name: 'shield', icon: Shield },
  { name: 'shopping-bag', icon: ShoppingBag },
  { name: 'shopping-cart', icon: ShoppingCart },
  { name: 'shuffle', icon: Shuffle },
  { name: 'sidebar', icon: Sidebar },
  { name: 'slash', icon: Slash },
  { name: 'smartphone', icon: Smartphone },
  { name: 'sun', icon: Sun },
  { name: 'tablet', icon: Tablet },
  { name: 'tag', icon: Tag },
  { name: 'terminal', icon: Terminal },
  { name: 'thumbs-down', icon: ThumbsDown },
  { name: 'thumbs-up', icon: ThumbsUp },
  { name: 'trash', icon: Trash },
  { name: 'trash-2', icon: Trash2 },
  { name: 'trending-down', icon: TrendingDown },
  { name: 'trending-up', icon: TrendingUp },
  { name: 'truck', icon: Truck },
  { name: 'twitter', icon: Twitter },
  { name: 'user', icon: User },
  { name: 'users', icon: Users },
  { name: 'video', icon: Video },
  { name: 'volume', icon: Volume },
  { name: 'wifi', icon: Wifi },
  { name: 'x', icon: X },
  { name: 'x-circle', icon: XCircle },
  { name: 'x-square', icon: XSquare },
  { name: 'youtube', icon: Youtube },
  { name: 'zap', icon: Zap },
  { name: 'zoom-in', icon: ZoomIn },
  { name: 'zoom-out', icon: ZoomOut }
];

interface IconSelectorProps {
  selectedIcon?: string | null;
  onIconSelect: (iconName: string) => void;
  className?: string;
}

export function IconSelector({
  selectedIcon,
  onIconSelect,
  className
}: IconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Find the currently selected icon component
  const SelectedIcon = selectedIcon 
    ? AVAILABLE_ICONS.find((iconInfo) => iconInfo.name === selectedIcon)?.icon 
    : null

  // Filter icons based on search term
  const filteredIcons = AVAILABLE_ICONS.filter((iconInfo) =>
    iconInfo.name.includes(searchTerm.toLowerCase())
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-32 h-10 p-2 ${className}`}
        >
          {SelectedIcon ? (
            <SelectedIcon className="w-5 h-5 mr-2" />
          ) : (
            <span className="text-muted-foreground">Select an Icon</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Search icons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          <div className="grid grid-cols-5 gap-2 h-64 overflow-y-auto">
            {filteredIcons.map(({ name, icon: Icon }) => (
              <Button
                key={name}
                variant={selectedIcon === name ? "secondary" : "ghost"}
                size="icon"
                onClick={() => {
                  onIconSelect(name)
                  setIsOpen(false)
                }}
                className="w-10 h-10 relative group"
                title={name}
              >
                <Icon className="w-5 h-5" />
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-popover-foreground text-popover px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  {name}
                </span>
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {filteredIcons.length} icons found
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default IconSelector