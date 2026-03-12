import { useEffect, useState, useRef } from 'react';
import { fetchMatches, Match } from './services/wikiService';
import { Clock, MapPin, ChevronDown, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { teamInfo } from './data/teams';

const getTeamInfo = (teamName: string) => {
  return teamInfo[teamName] || { name: teamName, flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Flag_of_None.svg/40px-Flag_of_None.svg.png' };
};

const getCountryFromLocation = (location: string) => {
  const loc = location.toLowerCase();
  if (loc.includes('mexico city') || loc.includes('zapopan') || loc.includes('guadalupe') || loc.includes('monterrey') || loc.includes('guadalajara')) return 'Mexico';
  if (loc.includes('toronto') || loc.includes('vancouver')) return 'Canada';
  return 'Mỹ';
};

const isKnockout = (group: string) => {
  return ['Vòng 1/16', 'Vòng 1/8', 'Tứ kết', 'Bán kết', 'Tranh hạng 3', 'Chung kết'].includes(group);
};

const groupOrder = [
  'Bảng A', 'Bảng B', 'Bảng C', 'Bảng D', 'Bảng E', 'Bảng F',
  'Bảng G', 'Bảng H', 'Bảng I', 'Bảng J', 'Bảng K', 'Bảng L',
  'Vòng 1/16', 'Vòng 1/8', 'Tứ kết', 'Bán kết', 'Tranh hạng 3', 'Chung kết'
];

const stages = ['Vòng bảng', 'Vòng 1/16', 'Vòng 1/8', 'Tứ kết', 'Bán kết', 'Tranh hạng 3', 'Chung kết'];

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'date' | 'group'>('date');
  const [activeGroup, setActiveGroup] = useState<string>('Bảng A');
  const [activeStage, setActiveStage] = useState<string>('Vòng bảng');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [dragged, setDragged] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [viewMode]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragged(false);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeftPos(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 5) {
      setDragged(true);
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeftPos - walk;
    }
  };

  useEffect(() => {
    fetchMatches()
      .then(data => {
        // Sort by timestamp
        data.sort((a, b) => a.timestamp - b.timestamp);
        setMatches(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allTeams = Object.keys(teamInfo).filter(t => t !== 'Chưa xác định').sort((a, b) => teamInfo[a].name.localeCompare(teamInfo[b].name));

  const toggleTeam = (team: string) => {
    setFavoriteTeams(prev => {
      if (prev.includes(team)) {
        return prev.filter(t => t !== team);
      }
      return [...prev, team];
    });
  };

  const filteredMatches = matches.filter(match => {
    if (viewMode === 'group') return true;
    if (favoriteTeams.length === 0) return true;
    return favoriteTeams.includes(match.home) || favoriteTeams.includes(match.away);
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;
    return 0;
  });

  const groupedMatches = sortedMatches.reduce((acc, match) => {
    if (viewMode === 'date') {
      let dateKey = 'Chưa xác định';
      if (match.datetimeHcm) {
        const parts = match.datetimeHcm.split(' - ');
        if (parts.length === 2) {
          dateKey = parts[1];
        }
      } else if (match.dateStr) {
        dateKey = match.dateStr;
      }
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(match);
    } else {
      const groupKey = match.group || 'Chưa xác định';
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(match);
    }
    return acc;
  }, {} as Record<string, Match[]>);

  let sortedKeys = Object.keys(groupedMatches);
  if (viewMode === 'date') {
    sortedKeys.sort((a, b) => {
      const timeA = groupedMatches[a][0].timestamp || 0;
      const timeB = groupedMatches[b][0].timestamp || 0;
      return timeA - timeB;
    });
  } else {
    sortedKeys.sort((a, b) => {
      const indexA = groupOrder.indexOf(a);
      const indexB = groupOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }

  const scrollToStage = (stage: string) => {
    setActiveStage(stage);
    let targetDateKey = null;
    for (const dateKey of sortedKeys) {
      const matchesInDate = groupedMatches[dateKey];
      const hasMatch = matchesInDate.some(m => {
        if (stage === 'Vòng bảng') return m.group.startsWith('Bảng');
        return m.group === stage;
      });
      if (hasMatch) {
        targetDateKey = dateKey;
        break;
      }
    }
    
    if (targetDateKey) {
      const el = document.getElementById(`date-group-${targetDateKey}`);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 20;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  if (viewMode === 'group') {
    for (const key of sortedKeys) {
      groupedMatches[key].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
  }

  const scrollToGroup = (group: string) => {
    setActiveGroup(group);
    const el = document.getElementById(`date-group-${group}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#222]">
      <main className="max-w-[720px] mx-auto px-4 py-8">
        {/* Main Content Area */}
        <div className="w-full">
          {/* Filters */}
          <div className="mb-8 space-y-6">
            {/* View Mode Toggle */}
            <div className="flex bg-[#f2f2f2] p-1 rounded inline-flex">
              <button 
                onClick={() => setViewMode('date')}
                className={`px-5 py-2 rounded text-sm font-bold transition-colors ${viewMode === 'date' ? 'bg-white text-[#9f224e] shadow-sm' : 'text-[#757575] hover:text-[#222]'}`}
              >
                Xem theo ngày
              </button>
              <button 
                onClick={() => setViewMode('group')}
                className={`px-5 py-2 rounded text-sm font-bold transition-colors ${viewMode === 'group' ? 'bg-white text-[#9f224e] shadow-sm' : 'text-[#757575] hover:text-[#222]'}`}
              >
                Xem theo bảng
              </button>
            </div>



            {/* Group Filter - Only visible in 'group' view */}
            {viewMode === 'group' && (
              <div className="relative flex items-center group/slider">
                {showLeftArrow && (
                  <button 
                    onClick={() => scroll('left')}
                    className="absolute left-0 z-10 w-8 h-8 flex items-center justify-center bg-white border border-[#e5e5e5] rounded-full shadow-sm text-[#4f4f4f] hover:text-[#9f224e] hover:border-[#9f224e] -ml-4 hidden lg:flex"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                
                <div 
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  className={`overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                  <div className="flex gap-2 whitespace-nowrap">
                    {groupOrder.map(group => (
                      <button
                        key={group}
                        onClick={(e) => {
                          if (dragged) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }
                          scrollToGroup(group);
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                          activeGroup === group 
                            ? 'bg-[#9f224e] text-white border-[#9f224e]' 
                            : 'bg-white text-[#4f4f4f] border-[#e5e5e5] hover:border-[#9f224e] hover:text-[#9f224e]'
                        }`}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </div>

                {showRightArrow && (
                  <button 
                    onClick={() => scroll('right')}
                    className="absolute right-0 z-10 w-8 h-8 flex items-center justify-center bg-white border border-[#e5e5e5] rounded-full shadow-sm text-[#4f4f4f] hover:text-[#9f224e] hover:border-[#9f224e] -mr-4 hidden lg:flex"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Favorite Teams Selector - Only visible in 'date' view */}
            {viewMode === 'date' && (
              <div className="relative" ref={dropdownRef}>
                <h3 className="font-bold text-[#222] mb-3">Xem lịch theo đội:</h3>
                
                {favoriteTeams.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {favoriteTeams.map(team => (
                      <span key={team} className="inline-flex items-center gap-1 px-3 py-1 bg-[#fdf2f5] text-[#9f224e] rounded-full text-sm font-medium border border-[#f5d0dc]">
                        <img src={getTeamInfo(team).flag} alt={team} className="w-4 h-3 object-cover border border-gray-200" referrerPolicy="no-referrer" />
                        {getTeamInfo(team).name}
                        <button onClick={() => toggleTeam(team)} className="hover:text-red-700 ml-1 focus:outline-none"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    <button 
                      onClick={() => setFavoriteTeams([])}
                      className="text-sm text-gray-500 hover:text-gray-700 underline ml-2"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                )}
                
                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 border border-[#e5e5e5] rounded bg-white text-left text-sm hover:border-gray-400 transition-colors"
                  >
                    <span className="text-gray-500">Chọn một hoặc nhiều đội...</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#e5e5e5] rounded shadow-lg max-h-[300px] flex flex-col">
                      <div className="p-2 border-b border-[#e5e5e5]">
                        <input 
                          type="text" 
                          placeholder="Tìm kiếm đội bóng..." 
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded text-sm focus:outline-none focus:border-[#9f224e]"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="p-1 overflow-y-auto flex-1">
                        {allTeams.filter(t => teamInfo[t].name.toLowerCase().includes(searchTerm.toLowerCase())).map(team => (
                          <label key={team} className="flex items-center px-3 py-2.5 hover:bg-[#f9f9f9] cursor-pointer rounded">
                            <div className="relative flex items-center justify-center w-4 h-4 mr-3 border border-gray-300 rounded bg-white">
                              <input 
                                type="checkbox" 
                                className="appearance-none w-full h-full cursor-pointer"
                                checked={favoriteTeams.includes(team)}
                                onChange={() => toggleTeam(team)}
                              />
                              {favoriteTeams.includes(team) && <Check className="w-3 h-3 text-[#9f224e] absolute pointer-events-none" />}
                            </div>
                            <img src={getTeamInfo(team).flag} alt={team} className="w-5 h-3.5 object-cover mr-2 border border-gray-200" referrerPolicy="no-referrer" />
                            <span className="text-sm text-[#222]">{getTeamInfo(team).name}</span>
                          </label>
                        ))}
                        {allTeams.filter(t => teamInfo[t].name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                          <div className="p-4 text-center text-sm text-gray-500">
                            Không tìm thấy đội bóng nào
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="text-right text-[13px] italic text-[#757575] mb-3">
            * Giờ thi đấu: GMT+7 Hanoi, Bangkok, Jakata
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-[#9f224e] border-t-transparent rounded-full mx-auto mb-4"></div>
              Đang tải dữ liệu...
            </div>
          ) : sortedKeys.length === 0 ? (
            <div className="py-20 text-center text-gray-500 border border-[#e5e5e5] rounded bg-[#f9f9f9]">
              Không có trận đấu nào phù hợp với lựa chọn của bạn.
            </div>
          ) : (
            <div className="space-y-8">
              {sortedKeys.map((key) => (
                <div key={key} id={`date-group-${key}`} className="border border-[#e5e5e5] rounded overflow-hidden">
                  <div className="bg-[#f7f7f7] px-4 py-3 border-b border-[#e5e5e5]">
                    <h2 className="text-[16px] font-bold text-[#9f224e] uppercase">
                      {viewMode === 'date' ? (key.includes('/') ? `Ngày ${key.replace('/2026', '')}` : key) : key}
                    </h2>
                  </div>
                  <div className="divide-y divide-[#e5e5e5]">
                    {groupedMatches[key].map(match => (
                      <div key={match.id} className="p-4 hover:bg-[#f9f9f9] transition-colors flex flex-col items-center justify-center gap-2">
                        
                        {/* Top: Group Name & Match Num & Country */}
                        <div className="text-[12px] sm:text-[13px] text-left sm:text-center text-[#757575] w-full mb-1 sm:mb-0">
                          {(viewMode === 'date' || isKnockout(match.group)) && (
                            <span>
                              {viewMode === 'date' && <span>{match.group}</span>}
                              {isKnockout(match.group) && (
                                <span>
                                  {viewMode === 'date' ? ` - ${match.matchNum}` : match.matchNum}
                                </span>
                              )}
                            </span>
                          )}
                          <span className="ml-1">
                            ({getCountryFromLocation(match.location)})
                          </span>
                        </div>

                        {/* Mobile Layout (2 rows) */}
                        <div className="flex sm:hidden w-full items-center justify-between mt-1">
                          <div className="flex flex-col gap-3 flex-1">
                            <div className="flex items-center gap-3">
                              <img src={getTeamInfo(match.home).flag} alt={match.home} className="w-7 h-5 object-cover border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                              <span className={`font-medium text-[15px] text-[#222] leading-snug ${favoriteTeams.includes(match.home) ? 'font-bold text-[#9f224e]' : ''}`}>
                                {getTeamInfo(match.home).name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <img src={getTeamInfo(match.away).flag} alt={match.away} className="w-7 h-5 object-cover border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                              <span className={`font-medium text-[15px] text-[#222] leading-snug ${favoriteTeams.includes(match.away) ? 'font-bold text-[#9f224e]' : ''}`}>
                                {getTeamInfo(match.away).name}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-center shrink-0 pl-4 border-l border-[#e5e5e5]">
                            <div className="text-[20px] font-bold text-[#222] leading-none">
                              {match.datetimeHcm ? match.datetimeHcm.split(' - ')[0] : '??:??'}
                            </div>
                            {viewMode === 'group' && match.dateStr && (
                              <div className="text-[12px] text-[#757575] mt-1">
                                {match.dateStr.replace('/2026', '')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Desktop Layout (1 row) */}
                        <div className="hidden sm:flex items-center justify-center gap-4 w-full my-1">
                          {/* Home Team */}
                          <div className="flex-1 flex items-center justify-end gap-3 text-right">
                            <span className={`font-medium text-[20px] text-[#222] leading-snug ${favoriteTeams.includes(match.home) ? 'font-bold text-[#9f224e]' : ''}`}>
                              {getTeamInfo(match.home).name}
                            </span>
                            <img src={getTeamInfo(match.home).flag} alt={match.home} className="w-10 h-6 object-cover border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                          </div>
                          
                          {/* Time */}
                          <div className="flex flex-col items-center justify-center shrink-0 min-w-[100px]">
                            <div className="text-[28px] font-bold text-[#222] leading-none">
                              {match.datetimeHcm ? match.datetimeHcm.split(' - ')[0] : '??:??'}
                            </div>
                            {viewMode === 'group' && match.dateStr && (
                              <div className="text-[12px] text-[#757575] mt-1">
                                {match.dateStr.replace('/2026', '')}
                              </div>
                            )}
                          </div>
                          
                          {/* Away Team */}
                          <div className="flex-1 flex items-center justify-start gap-3 text-left">
                            <img src={getTeamInfo(match.away).flag} alt={match.away} className="w-10 h-6 object-cover border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                            <span className={`font-medium text-[20px] text-[#222] leading-snug ${favoriteTeams.includes(match.away) ? 'font-bold text-[#9f224e]' : ''}`}>
                              {getTeamInfo(match.away).name}
                            </span>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
