# Mario-Style Level Editor Specification

## Project Overview

This document outlines the development plan for a full-stack Mario-style platformer game with level creation capabilities. The project features a React-based frontend for the level editor UI and Phaser.js for game rendering and physics.

### Core Features
- **Level Editor**: Drag-and-drop interface for placing game objects
- **Camera System**: Google Maps-style navigation with mouse dragging
- **Grid-Based Placement**: Automatic snapping for precise object positioning
- **Multi-Platform Support**: Create, save, edit, and publish levels
- **Game Object Management**: Comprehensive tools for object manipulation

## Architecture

### Frontend Stack
- **React**: UI components and editor palette
- **Phaser.js**: Game rendering, physics, and camera management
- **Canvas Integration**: Real-time level editing within game viewport

### Key Components
1. **React UI Palette** - Sidebar with draggable game objects
2. **Phaser Game Canvas** - Main editing/preview area
3. **Camera System** - Viewport management and navigation
4. **Grid System** - Snap-to-grid functionality
5. **Object Manager** - Placement, storage, and manipulation logic

## Development Roadmap

### Phase 1: Core Camera and Navigation
- [ ] **Learn Phaser Camera Basics**
  - Understand camera bounds, zoom, and viewport concepts
  - Implement basic camera movement controls
  
- [ ] **Implement Google Maps-style Navigation**
  - Add mouse drag functionality for camera movement
  - Implement smooth camera panning
  - Set appropriate camera bounds for level boundaries

- [ ] **Level Expansion System**
  - Create functionality to dynamically add/remove level space
  - Implement level boundary management
  - Handle camera bounds updates when level size changes

### Phase 2: Coordinate Systems and Grids
- [ ] **Master Coordinate Systems**
  - Understand canvas coordinates vs world coordinates
  - Implement coordinate conversion utilities
  - Handle screen-to-world and world-to-screen transformations

- [ ] **Grid System Implementation**
  - Create visual grid overlay in Phaser
  - Implement grid-based snapping logic
  - Make grid responsive to camera zoom levels

- [ ] **Camera-Grid Synchronization**
  - Ensure grid alignment when camera moves
  - Implement clean snapping based on grid divisions
  - Handle grid visibility and density at different zoom levels

### Phase 3: Object Placement System
- [ ] **React-Phaser Integration**
  - Set up drag-and-drop from React palette to Phaser canvas
  - Implement mouse position tracking across React/Phaser boundary
  - Create object preview system during drag operations

- [ ] **Auto-Snapping Mechanism**
  - Implement grid-based object placement
  - Create visual feedback for snap positions
  - Handle different object sizes and snap requirements

- [ ] **Game Object Storage**
  - Design level data structure for storing placed objects
  - Implement object serialization/deserialization
  - Create efficient object lookup and management system

### Phase 4: Advanced Placement Rules
- [ ] **Intelligent Object Placement**
  - Implement placement validation rules (e.g., enemies on platforms)
  - Create object interaction and dependency systems
  - Add placement constraints and warnings

- [ ] **Platform-Specific Logic**
  - Detect valid platform surfaces for enemy placement
  - Implement object stacking and layering rules
  - Handle collision detection during placement

### Phase 5: Object Management Tools
- [ ] **Object Manipulation**
  - Implement click-to-select functionality
  - Add object movement with drag-and-drop
  - Create object deletion system with confirmation

- [ ] **Platform Resizing**
  - Add resize handles to platform objects
  - Implement real-time resize preview
  - Maintain grid alignment during resize operations

- [ ] **Selection and Multi-Select**
  - Implement single and multiple object selection
  - Add selection rectangle tool
  - Create group operations (move, delete, copy)

### Phase 6: Editor Features
- [ ] **Undo/Redo System**
  - Implement command pattern for all editor operations
  - Create undo stack with reasonable memory limits
  - Add keyboard shortcuts (Ctrl+Z, Ctrl+Y)

- [ ] **Level Persistence**
  - Design level file format (JSON recommended)
  - Implement save/load functionality
  - Add auto-save capabilities

- [ ] **Level Management**
  - Create level browser/selector interface
  - Implement level editing and updating
  - Add level metadata (name, description, difficulty)

## Additional Features to Consider

### User Experience Enhancements
- [ ] **Keyboard Shortcuts**
  - Common operations (copy, paste, delete, undo, redo)
  - Quick object selection and switching
  - Camera navigation with arrow keys

- [ ] **Visual Feedback**
  - Hover states for interactive elements
  - Object selection indicators
  - Placement validation visual cues
  - Loading states and progress indicators

- [ ] **Performance Optimization**
  - Object culling for large levels
  - Efficient rendering for off-screen objects
  - Memory management for undo/redo operations

### Advanced Editor Features
- [ ] **Layer System**
  - Background, midground, foreground layers
  - Layer visibility toggles
  - Layer-specific object placement

- [ ] **Copy/Paste and Templates**
  - Object duplication functionality
  - Template system for common patterns
  - Level section copying between levels

- [ ] **Zoom Controls**
  - Mouse wheel zoom functionality
  - Zoom level indicators
  - Fit-to-screen and actual size views

### Game-Specific Features
- [ ] **Object Properties Panel**
  - Editable properties for selected objects
  - Animation and behavior settings
  - Trigger and event configuration

- [ ] **Level Testing**
  - In-editor play testing mode
  - Player spawn point management
  - Victory condition setup

- [ ] **Asset Management**
  - Sprite and tileset organization
  - Custom asset upload capabilities
  - Asset preview in palette

### Collaboration and Sharing
- [ ] **Level Validation**
  - Check for playability requirements
  - Validate level completion paths
  - Asset dependency verification

- [ ] **Export Options**
  - Different file format exports
  - Level packaging for distribution
  - Thumbnail generation

- [ ] **Version Control**
  - Level history and versioning
  - Collaboration features
  - Conflict resolution

## Technical Considerations

### Performance
- Implement object pooling for frequently created/destroyed objects
- Use spatial partitioning for efficient collision detection
- Consider WebGL vs Canvas rendering based on complexity

### Browser Compatibility
- Test across major browsers (Chrome, Firefox, Safari, Edge)
- Handle touch input for tablet/mobile testing
- Consider responsive design for different screen sizes

### Data Management
- Plan for level size limitations and optimization
- Consider compression for large levels
- Implement efficient change detection for auto-save

## Success Metrics
- Smooth 60fps performance during editing
- Intuitive user experience requiring minimal learning
- Stable level saving/loading without data loss
- Responsive drag-and-drop operations
- Clean grid alignment and snapping behavior

---

*This specification serves as a living document and should be updated as development progresses and new requirements emerge.*