import { useSwipeable } from 'react-swipeable';
import { useState } from 'react';

interface SwipeableListItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}

export default function SwipeableListItem({
  children,
  onDelete,
  className = ''
}: SwipeableListItemProps) {
  const [swiping, setSwiping] = useState(false);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      setSwiping(true);
      setTimeout(() => {
        setSwiping(false);
      }, 3000);
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  return (
    <li
      {...swipeHandlers}
      className={`swipeable-item ${className} ${swiping ? 'swiping' : ''}`}
    >
      {children}
      <button
        className="delete-btn"
        onClick={onDelete}
        title="删除此记录"
      >
        ×
      </button>
    </li>
  );
}
