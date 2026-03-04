"use client";

import { useState, useRef, useEffect } from "react";
import { exportToImage, exportToPDF } from "../utils/export";

// Hooks
import { useChat } from "../hooks/useChat";
import { useNutrition } from "../hooks/useNutrition";
import { useHistory } from "../hooks/useHistory";
import { useRecipe } from "../hooks/useRecipe";
import { useFoodOptions } from "../hooks/useFoodOptions";

// Components
import Toast from "../components/Toast";
import NutritionPanel from "../components/Nutrition/NutritionPanel";
import ChatMessageComponent from "../components/Chat/ChatMessage";
import ChatInput from "../components/Chat/ChatInput";
import WelcomeScreen from "../components/Chat/WelcomeScreen";
import HistoryModal from "../components/Modals/HistoryModal";
import RecipeModal from "../components/Modals/RecipeModal";
import NutritionModal from "../components/Modals/NutritionModal";
import FoodOptionsModal from "../components/Modals/FoodOptionsModal";
import QuickRecordModal from "../components/Modals/QuickRecordModal";
import ChatHistoryModal from "../components/Modals/ChatHistoryModal";
import AdminButton from "../components/Admin/AdminButton";
import AdminPasswordModal from "../components/Admin/AdminPasswordModal";
import AdminPanel from "../components/Admin/AdminPanel";

// Types
import type { SelectedFood } from "../types";
import { apiGetMealsToday, apiQuickRecord } from "../services/api";

export default function Home() {
  // Custom Hooks
  const { messages, loading, sendMessage, loadSession } = useChat();
  const { nutrition, loadNutrition } = useNutrition();
  const { todayMeals, todayExercises, loadHistory, handleDeleteMeal, handleDeleteExercise } = useHistory();
  const { recipeText, recipeLoading, loadRecipe } = useRecipe();
  const { foodCategories, loadFoodOptions } = useFoodOptions();

  // UI State
  const [input, setInput] = useState("");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showFoodOptions, setShowFoodOptions] = useState(false);
  const [showQuickRecord, setShowQuickRecord] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recipeContentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    await sendMessage(userMsg, (data) => {
      if (data.has_recording) {
        // Refresh nutrition data
        if (data.nutrition_summary) {
          loadNutrition();
        }
        // Refresh meals list
        apiGetMealsToday()
          .then((result) => {
            // Update meals in history hook would require exposing setter
            // For now, just trigger a refresh when history modal opens
          })
          .catch(() => {});
        // Show toast notification
        if (data.records && data.records.length > 0) {
          const record = data.records[0];
          if (record.message) {
            setToast({ message: record.message, type: "success" });
          } else if (record.type === "record_meal") {
            const food = record.data?.food || "食物";
            const calories = record.nutrition?.calories || 0;
            setToast({ message: `已记录: ${food} (${calories.toFixed(0)} kcal)`, type: "success" });
          } else if (record.type?.includes("delete")) {
            setToast({ message: record.message || "已删除记录", type: "success" });
          }
        }
      }
      inputRef.current?.focus();
    });
  };

  // Handle recipe load
  const handleLoadRecipe = async (forceNew: boolean = false) => {
    setShowRecipe(true);
    await loadRecipe(forceNew);
  };

  // Handle history load
  const handleLoadHistory = async () => {
    try {
      await loadHistory();
      setShowHistory(true);
    } catch {
      setToast({ message: "加载历史记录失败", type: "error" });
    }
  };

  // Handle delete meal
  const handleDeleteMealWrapper = async (mealId: number) => {
    try {
      await handleDeleteMeal(mealId);
      setToast({ message: "已删除记录", type: "success" });
      loadNutrition();
    } catch {
      setToast({ message: "删除失败", type: "error" });
    }
  };

  // Handle delete exercise
  const handleDeleteExerciseWrapper = async (exerciseId: number) => {
    try {
      await handleDeleteExercise(exerciseId);
      setToast({ message: "已删除记录", type: "success" });
    } catch {
      setToast({ message: "删除失败", type: "error" });
    }
  };

  // Handle food options load
  const handleLoadFoodOptions = async () => {
    try {
      const success = await loadFoodOptions();
      if (success) {
        setShowFoodOptions(true);
      } else {
        setToast({ message: "暂无食物选项数据", type: "warning" });
      }
    } catch (error) {
      setToast({ message: "加载食物选项失败，请检查后端服务", type: "error" });
      setShowFoodOptions(false);
    }
  };

  // Handle quick record submit
  const handleQuickRecordSubmit = async (mealType: string, foods: SelectedFood[]) => {
    try {
      const data = await apiQuickRecord(mealType, foods);
      if (data.recorded) {
        setShowQuickRecord(false);
        setShowFoodOptions(false);
        setToast({ message: `已记录 ${foods.length} 项食物`, type: "success" });
        loadNutrition();
      }
    } catch {
      setToast({ message: "记录失败", type: "error" });
    }
  };

  // Export handlers
  const exportImageHandler = async () => {
    if (!recipeContentRef.current) return;
    try {
      await exportToImage(recipeContentRef.current, `eatsmart-recipe-${new Date().toISOString().slice(0, 10)}`);
    } catch {
      alert("导出图片失败");
    }
  };

  const exportPDFHandler = async () => {
    if (!recipeContentRef.current) return;
    try {
      await exportToPDF(recipeContentRef.current, `eatsmart-recipe-${new Date().toISOString().slice(0, 10)}`);
    } catch {
      alert("导出PDF失败");
    }
  };

  // Quick action
  const quickAction = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  // Handle admin button click
  const handleAdminClick = () => {
    setShowAdminPassword(true);
  };

  // Handle admin password success
  const handleAdminPasswordSuccess = (password: string) => {
    setAdminPassword(password);
    setShowAdminPassword(false);
    setShowAdminPanel(true);
    sessionStorage.setItem('admin_password', password);
  };

  // Handle load chat history session
  const handleLoadChatSession = (messages: any[]) => {
    loadSession(messages);
    setToast({ message: "已加载历史对话", type: "success" });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div className="header-brand">
          <h1>🥗 EatSmart</h1>
          <div className="subtitle">糖尿病 + 胰腺炎康复期 · AI 饮食管理</div>
        </div>

        {/* Desktop: Show all buttons */}
        <div className="header-actions desktop-only">
          <button className="header-btn" onClick={handleLoadHistory}>
            📋 记录
          </button>
          <button className="header-btn" onClick={handleLoadFoodOptions}>
            📝 推荐
          </button>
          <button className="header-btn" onClick={() => handleLoadRecipe()}>
            🍱 食谱
          </button>
          <button className="header-btn" onClick={() => setShowChatHistory(true)}>
            💬 历史
          </button>
          <AdminButton onClick={handleAdminClick} />
        </div>

        {/* Mobile: Hamburger menu */}
        <button
          className="hamburger-btn mobile-only"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label="菜单"
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="mobile-menu-overlay" onClick={() => setShowMobileMenu(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h3>菜单</h3>
              <button className="close-btn" onClick={() => setShowMobileMenu(false)}>✕</button>
            </div>
            <div className="mobile-menu-items">
              <button className="mobile-menu-item" onClick={() => { handleLoadHistory(); setShowMobileMenu(false); }}>
                📋 记录
              </button>
              <button className="mobile-menu-item" onClick={() => { handleLoadFoodOptions(); setShowMobileMenu(false); }}>
                📝 推荐
              </button>
              <button className="mobile-menu-item" onClick={() => { handleLoadRecipe(); setShowMobileMenu(false); }}>
                🍱 食谱
              </button>
              <button className="mobile-menu-item" onClick={() => { setShowChatHistory(true); setShowMobileMenu(false); }}>
                💬 历史
              </button>
              <button className="mobile-menu-item" onClick={() => { handleAdminClick(); setShowMobileMenu(false); }}>
                ⚙️ 管理
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="main-area">
        {/* Chat Section */}
        <div className="chat-section">
          <div className="disclaimer">
            ⚕️ 本系统仅供参考，具体饮食方案请遵循主治医生的医嘱
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <WelcomeScreen
                onQuickAction={quickAction}
                onLoadRecipe={() => handleLoadRecipe()}
                onLoadFoodOptions={handleLoadFoodOptions}
              />
            )}

            {messages.map((msg, idx) => (
              <ChatMessageComponent key={idx} message={msg} />
            ))}

            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSendMessage}
            disabled={loading}
          />
        </div>

        {/* Nutrition Side Panel - Desktop */}
        <NutritionPanel
          nutrition={nutrition}
          collapsed={panelCollapsed}
          onToggle={() => setPanelCollapsed(!panelCollapsed)}
        />
      </div>

      {/* Modals */}
      {showRecipe && (
        <RecipeModal
          recipe={recipeText}
          loading={recipeLoading}
          onClose={() => setShowRecipe(false)}
          onRefresh={() => handleLoadRecipe(true)}
          onExportImage={exportImageHandler}
          onExportPDF={exportPDFHandler}
          recipeRef={recipeContentRef}
        />
      )}

      {showHistory && (
        <HistoryModal
          meals={todayMeals}
          exercises={todayExercises}
          onClose={() => setShowHistory(false)}
          onDeleteMeal={handleDeleteMealWrapper}
          onDeleteExercise={handleDeleteExerciseWrapper}
        />
      )}

      {showNutrition && (
        <NutritionModal
          nutrition={nutrition}
          onClose={() => setShowNutrition(false)}
        />
      )}

      {showFoodOptions && foodCategories.length > 0 && !showQuickRecord && (
        <FoodOptionsModal
          categories={foodCategories}
          onClose={() => setShowFoodOptions(false)}
          onStartRecord={() => setShowQuickRecord(true)}
        />
      )}

      {showQuickRecord && foodCategories.length > 0 && (
        <QuickRecordModal
          categories={foodCategories}
          onClose={() => setShowQuickRecord(false)}
          onSubmit={handleQuickRecordSubmit}
        />
      )}

      {showChatHistory && (
        <ChatHistoryModal
          onClose={() => setShowChatHistory(false)}
          onLoadSession={handleLoadChatSession}
        />
      )}

      {showAdminPassword && (
        <AdminPasswordModal
          onClose={() => setShowAdminPassword(false)}
          onSuccess={handleAdminPasswordSuccess}
        />
      )}

      {showAdminPanel && (
        <AdminPanel
          password={adminPassword}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {/* Floating Action Button - Mobile */}
      <button
        className="fab-nutrition mobile-only"
        onClick={() => setShowNutrition(true)}
        title="查看营养进度"
      >
        <span className="fab-icon">📊</span>
        <span className="fab-label">进度</span>
      </button>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
