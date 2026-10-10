import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search } from 'lucide-react'

const CATEGORIES = [
  { id: 'recent',  label: 'Recent',       icon: '🕐' },
  { id: 'smileys', label: 'Smileys',      icon: '😀' },
  { id: 'people',  label: 'People',       icon: '🧑' },
  { id: 'animals', label: 'Animals',      icon: '🐶' },
  { id: 'food',    label: 'Food',         icon: '🍕' },
  { id: 'travel',  label: 'Travel',       icon: '✈️' },
  { id: 'objects', label: 'Objects',      icon: '💡' },
  { id: 'symbols', label: 'Symbols',      icon: '❤️' },
  { id: 'flags',   label: 'Flags',        icon: '🏳️' },
]

const EMOJIS = {
  smileys: [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
    '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐',
    '🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒',
    '🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥸','😎','🤓','🧐','😕','😟',
    '🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖',
    '😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡',
  ],
  people: [
    '👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆',
    '💁','🙋','🧏','🙇','🤦','🤷','👮','🕵️','💂','🥷','👷','🤴','👸','👳','👲','🧕',
    '🤵','👰','🤰','🤱','👼','🎅','🤶','🧙','🧝','🧛','🧟','🧞','🧜','🧚','👨‍⚕️','👩‍⚕️',
    '👨‍🎓','👩‍🎓','👨‍🏫','👩‍🏫','👨‍⚖️','👩‍⚖️','👨‍🌾','👩‍🌾','👨‍🍳','👩‍🍳','👨‍🔧','👩‍🔧','👨‍🏭','👩‍🏭','👨‍💼','👩‍💼',
    '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆',
    '🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪',
  ],
  animals: [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
    '🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌',
    '🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🦎','🐍','🦕','🦖','🦎','🐙','🦑','🦐','🦞',
    '🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘',
    '🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐',
    '🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️',
  ],
  food: [
    '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥',
    '🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🧄','🧅','🥔','🍠','🥐','🥯','🍞',
    '🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕',
    '🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍛','🍣','🍱',
    '🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍡','🧁','🎂','🍰','🍮','🍭','🍬','🍫',
    '☕','🍵','🧃','🥤','🧋','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧊','🥄','🍴','🍽️',
  ],
  travel: [
    '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛵','🏍️',
    '🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟',
    '⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡',
    '🛰️','🚀','🛸','🪐','🌌','🌠','⛺','🏕️','🌋','🗺️','🏔️','⛰️','🗻','🏗️','🧱','🪵',
    '🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙️','🌃','🌉','🌌','🌁','🗼','🗽','🗾','🏰',
    '🎡','🎢','🎠','⛲','⛺','🌊','🏄','🏊','🚣','🧗','🏇','🚵','🏋️','🤸','⛹️','🤺',
  ],
  objects: [
    '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💽','💾','💿','📀','🎥','📽️','🎞️',
    '📞','☎️','📟','📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌',
    '💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','💰','💳','💎','⚖️','🧲',
    '🔧','🔨','⚒️','🛠️','🪛','⛏️','🔩','🪤','🧰','🔑','🗝️','🔐','🔒','🔓','🪝','🪜',
    '🪞','🪟','🛋️','🚪','🪑','🧳','🌂','☂️','☔','⛱️','⚡','❄️','🌈','💧','🌊','🎁',
    '🎈','🎏','🎀','🪅','🎊','🎉','🪁','🎎','🎐','🎑','🧧','🎗️','🎟️','🎫','🎖️','🏆',
  ],
  symbols: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
    '💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈',
    '♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','⛎','🔀','🔁','🔂','▶️',
    '⏩','⏭️','⏯️','◀️','⏪','⏮️','🔼','⏫','🔽','⏬','⏸️','⏹️','⏺️','⏏️','🎦','🔅',
    '✅','❎','🆗','🆕','🆙','🆒','🆓','🆖','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕',
    '🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🔕','⭐','🌟',
  ],
  flags: [
    '🏳️','🏴','🚩','🏁','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇦🇫','🇦🇱','🇩🇿','🇦🇩','🇦🇴','🇦🇬','🇦🇷','🇦🇲','🇦🇺',
    '🇦🇹','🇦🇿','🇧🇸','🇧🇭','🇧🇩','🇧🇧','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇧🇳',
    '🇧🇬','🇧🇫','🇧🇮','🇨🇻','🇰🇭','🇨🇲','🇨🇦','🇨🇫','🇹🇩','🇨🇱','🇨🇳','🇨🇴','🇰🇲','🇨🇬','🇨🇩','🇨🇷',
    '🇨🇮','🇭🇷','🇨🇺','🇨🇾','🇨🇿','🇩🇰','🇩🇯','🇩🇲','🇩🇴','🇪🇨','🇪🇬','🇸🇻','🇬🇶','🇪🇷','🇪🇪','🇸🇿',
    '🇪🇹','🇫🇯','🇫🇮','🇫🇷','🇬🇦','🇬🇲','🇬🇪','🇩🇪','🇬🇭','🇬🇷','🇬🇩','🇬🇹','🇬🇳','🇬🇼','🇬🇾','🇭🇹',
    '🇭🇳','🇭🇺','🇮🇸','🇮🇳','🇮🇩','🇮🇷','🇮🇶','🇮🇪','🇮🇱','🇮🇹','🇯🇲','🇯🇵','🇯🇴','🇰🇿','🇰🇪','🇰🇮',
  ],
}

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState('smileys')
  const [search, setSearch] = useState('')
  const [recent, setRecent] = useState(['😊','👍','🙏','❤️','🔥','✅','😂','💯'])
  const pickerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const displayed = useMemo(() => {
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const all = Object.values(EMOJIS).flat()
      return all.filter(e => e.includes(q) || q.length <= 2)
    }
    if (activeCategory === 'recent') return recent
    return EMOJIS[activeCategory] || []
  }, [search, activeCategory, recent])

  const handlePick = (emoji) => {
    onSelect(emoji)
    setRecent(prev => {
      const next = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 24)
      return next
    })
  }

  return (
    <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.22,1,0.36,1] }}
      style={{
        position: 'absolute', bottom: '76px', left: '14px', zIndex: 40,
        width: '340px',
        background: 'var(--bg-surface)',
        borderRadius: '20px',
        border: '1px solid var(--border-light)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-hover)', borderRadius: '10px', padding: '7px 12px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search emoji..."
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}
            />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px' }}>
            <X size={15} />
          </button>
        </div>

        {/* Category tabs */}
        {!search && (
          <div style={{ display: 'flex', gap: '2px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.label}
                style={{
                  background: activeCategory === cat.id ? 'var(--primary-soft)' : 'transparent',
                  border: 'none', cursor: 'pointer', borderRadius: '8px',
                  padding: '4px 7px', fontSize: '16px', lineHeight: 1,
                  flexShrink: 0,
                  transition: 'background 0.12s',
                  filter: activeCategory === cat.id ? 'none' : 'grayscale(40%)',
                  opacity: activeCategory === cat.id ? 1 : 0.7,
                }}
              >
                {cat.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category label */}
      {!search && (
        <div style={{ padding: '6px 14px 2px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {CATEGORIES.find(c => c.id === activeCategory)?.label}
          </span>
        </div>
      )}

      {/* Emoji grid */}
      <div style={{ padding: '6px 10px 10px', display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: '2px', maxHeight: '220px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
        {displayed.map((emoji, i) => (
          <motion.button
            key={`${emoji}-${i}`}
            onClick={() => handlePick(emoji)}
            whileHover={{ scale: 1.25, background: 'var(--bg-hover)' }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '22px', lineHeight: 1, padding: '5px 2px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s',
            }}
          >
            {emoji}
          </motion.button>
        ))}
        {displayed.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No emoji found</div>
        )}
      </div>
    </motion.div>
  )
}
