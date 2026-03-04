import MarkdownRenderer from "../MarkdownRenderer";

interface RecipeModalProps {
  recipe: string;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onExportImage: () => void;
  onExportPDF: () => void;
  recipeRef: React.RefObject<HTMLDivElement | null>;
}

export default function RecipeModal({
  recipe,
  loading,
  onClose,
  onRefresh,
  onExportImage,
  onExportPDF,
  recipeRef,
}: RecipeModalProps) {
  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card" onClick={(e) => e.stopPropagation()}>
        <div className="recipe-header">
          <h2>🍽️ 今日食谱推荐</h2>
          <div className="recipe-export-btns">
            <button className="btn-icon" onClick={onExportImage} title="保存为图片">
              🖼️
            </button>
            <button className="btn-icon" onClick={onExportPDF} title="保存为PDF">
              📄
            </button>
          </div>
        </div>
        {loading ? (
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        ) : (
          <div className="recipe-content" ref={recipeRef}>
            <MarkdownRenderer content={recipe} />
          </div>
        )}
        <div className="recipe-actions">
          <button className="btn-secondary" onClick={onRefresh}>
            🔄 换一套
          </button>
          <button className="btn-primary" onClick={onClose}>
            👍 好的
          </button>
        </div>
      </div>
    </div>
  );
}
