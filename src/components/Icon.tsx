import {
  HiMenu,
  HiArrowRight,
  HiChevronRight,
  HiChevronDown,
  HiLocationMarker,
  HiPhone,
  HiMail,
  HiHome,
  HiInformationCircle,
  HiTag,
  HiPhotograph,
  HiSupport,
  HiDesktopComputer,
  HiClock,
  HiCalendar,
  HiLockClosed,
  HiMap,
  HiGlobe,
  HiShieldCheck,
} from "react-icons/hi";
import {
  FaSwimmingPool,
  FaWifi,
  FaBath,
  FaFacebook,
  FaCamera,
  FaWhatsapp,
} from "react-icons/fa";
import {
  GiVillage,
  GiMountains,
  GiSnowflake2,
  GiChefToque,
  GiWeightLiftingDown,
  GiGlassCelebration,
  GiCookingPot,
  GiBroom,
  GiPineTree,
  GiWaves,
  GiFlowerTwirl,
  GiRingingBell,
} from "react-icons/gi";
import { MdRestaurant, MdOutlineOutdoorGrill, MdOutlineExplore } from "react-icons/md";
import { TbVideo, TbNews } from "react-icons/tb";

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  // Navigation
  menu: HiMenu,
  home: HiHome,
  info: HiInformationCircle,
  spa: GiFlowerTwirl,
  sell: HiTag,
  photo_library: HiPhotograph,
  contact_support: HiSupport,

  // Actions
  arrow_forward: HiArrowRight,
  arrow_right_alt: HiArrowRight,
  arrow_forward_ios: HiChevronRight,
  expand_more: HiChevronDown,

  // Communication
  chat: FaWhatsapp,
  mail: HiMail,
  call: HiPhone,
  phone_in_talk: HiPhone,

  // Location
  location_on: HiLocationMarker,
  map: HiMap,
  explore: MdOutlineExplore,
  public: HiGlobe,
  local_airport: HiGlobe,

  // Amenities
  villa: GiVillage,
  pool: FaSwimmingPool,
  restaurant: MdRestaurant,
  landscape: GiMountains,
  wifi: FaWifi,
  ac_unit: GiSnowflake2,
  balcony: GiVillage,
  bathtub: FaBath,
  chef_hat: GiChefToque,
  fitness_center: GiWeightLiftingDown,
  local_bar: GiGlassCelebration,
  concierge: GiRingingBell,
  skillet: GiCookingPot,
  cleaning_services: GiBroom,
  security: HiShieldCheck,
  nature: GiPineTree,
  waves: GiWaves,
  outdoor_grill: MdOutlineOutdoorGrill,
  schedule: HiClock,
  tv: HiDesktopComputer,
  sports_esports: HiDesktopComputer,
  calendar_today: HiCalendar,
  lock: HiLockClosed,
  video_library: TbVideo,

  // Social
  facebook: FaFacebook,
  photo_camera: FaCamera,
  camera: FaCamera,

  // Misc
  face_nod: TbNews,
  smart_display: TbVideo,
};

interface IconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

export default function Icon({ name, className = "", style = {}, size }: IconProps) {
  const IconComp = iconMap[name];
  if (!IconComp) {
    // Fallback: show the name as text if icon not found
    return <span className={`inline-block ${className}`}>{name}</span>;
  }
  return <IconComp className={className} style={style} />;
}
