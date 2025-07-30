import EmojiPickerReact from 'emoji-picker-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: any) => void;
}

export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const handleEmojiClick = (emojiData: any) => {
    onEmojiSelect(emojiData);
  };

  return (
    <EmojiPickerReact
      onEmojiClick={handleEmojiClick}
      width={300}
      height={400}
      searchDisabled={false}
      skinTonesDisabled={false}
      previewConfig={{
        showPreview: false
      }}
    />
  );
}; 