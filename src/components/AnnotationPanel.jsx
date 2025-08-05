import React, { useState, useEffect } from "react";
import "../styles/AnnotationPanel.css";

const AnnotationPanel = ({ app, setAnnotations, annotations}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#ff0000');
  const [key, setKey] = useState('');
  const [type, setType] = useState('discrète');
  const [group, setGroup] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [, forceUpdate] = useState(0);

  const liste_categories = app.getOnlyCategories();

  useEffect(() => {
    if (!app) return;
    setAnnotations(app.getOnlyAnnotations?.() || []);
    setCategories(app.getOnlyCategories?.() || []);
    forceUpdate(n => n + 1);
  }, [app, setAnnotations]);

  useEffect(() => {
    if (editIndex === null) {
      setName('');
      setColor('#ff0000');
      setKey('');
      setType('discrète');
      setGroup('');
      setEditingGroup(null);
    }
    forceUpdate(n => n + 1);
  }, [editIndex]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !key) return;

    const isDiscrete = type === 'discrète';

    const keyAlreadyUsed = [
      ...(annotations || []),
      ...(liste_categories?.flatMap?.(cat => cat.getAnnotations?.() || []) || [])
    ].some(
      (ann, i) =>
        ann.key?.toLowerCase?.() === key?.toLowerCase() &&
        (editingGroup !== null || i !== editIndex)
    );
    if (keyAlreadyUsed) {
      setErrorMessage("Cette touche est déjà utilisée pour une autre annotation.");
      return;
    }


    if (editIndex !== null) {
      const freshCategories = app.getOnlyCategories?.() || [];
      const annotationToUpdate = editingGroup
        ? freshCategories.find(c => c.getName?.() === editingGroup)?.getAnnotations?.()[editIndex]
        : annotations[editIndex];

      if (!annotationToUpdate) return;

      annotationToUpdate.setName?.(name);
      annotationToUpdate.setColor?.(color);
      annotationToUpdate.setKey?.(key);
      annotationToUpdate.setIsDiscrete?.(isDiscrete);
      annotationToUpdate.setGroup?.(group || null);
    } else {
      if (group) {
        let targetGroup = app.getCategoryByName(group);
        if (!targetGroup) targetGroup = app.addCategory?.(group);
        targetGroup?.addAnnotationByParams?.(name, color, key, isDiscrete);
      } else {
        app.addAnnotation?.(name, color, key, isDiscrete);
      }
    }

    setErrorMessage('');

    setAnnotations(app.getOnlyAnnotations?.() || []);
    setCategories(app.getAnnotationCategories?.() || []);
    setEditIndex(null);

    setName('');
    setColor('#ff0000');
    setKey('');
    setType('discrète');
    setGroup('');
    setEditingGroup(null);
  };

  const handleEdit = (index, fromCategory = false, groupName = "") => {
    const freshCategories = app.getOnlyCategories?.() || [];
    const ann = fromCategory
      ? freshCategories.find(c => c.getName?.() === groupName)?.getAnnotations?.()[index]
      : annotations[index];

    if (!ann) return;

    
    const keyAlreadyUsed = [
      ...(annotations || []),
      ...(liste_categories?.flatMap?.(cat => cat.getAnnotations?.() || []) || [])
    ].some(
      (new_ann, i) =>
        new_ann.key?.toLowerCase?.() === key?.toLowerCase() &&
        (editingGroup !== null || i !== editIndex)
    );
  console.log(key?.toLowerCase())
  console.log(ann.key?.toLowerCase?.())
   if (keyAlreadyUsed && ann.key?.toLowerCase?.() !== key?.toLowerCase()) {
      setErrorMessage("Cette touche est déjà utilisée pour une autre annotation.");
      return;
    }
    setName(ann.name);
    setKey(ann.key);
    setColor(ann.color);
    setType(ann.isDiscrete ? "discrète" : "continue");
    setGroup(fromCategory ? groupName : '');
    setEditIndex(index);
    setEditingGroup(fromCategory ? groupName : null);
    forceUpdate(n => n + 1);


  };

  const handleDeleteAnnotation = (index, fromCategory = false, groupName = "") => {
    if (fromCategory) {
      const freshCategories = app.getOnlyCategories?.() || [];
      const category = freshCategories.find(c => c.getName?.() === groupName);
      category?.removeAnnotationByIndex?.(index);
    } else {
      app.removeAnnotationByKey(annotations[index].key);
    }

    setAnnotations(app.getOnlyAnnotations?.() || []);
    setCategories(app.getAnnotationCategories?.() || []);
    setEditIndex(null);
    forceUpdate(n => n + 1);
  };

  const handleAddToGroup = (groupName) => {
    setName("");
    setKey("");
    setType("discrète");
    setColor("#e08ee1");
    setGroup(groupName);
    setEditIndex(null);
    setEditingGroup(null);
    forceUpdate(n => n + 1);
  };

  const handleDeleteGroup = (groupName) => {
    app.removeAnnotationOrCategoryByName?.(groupName); 

    setCategories(app.getAnnotationCategories?.() || []);
    forceUpdate(n => n + 1);
  };


  const allGroups = (categories || []).map(cat => cat.getName?.()).filter(Boolean);
  //const annonation_a_afficher = app.getOnlyAnnotations();

  return (
    <div className="annotation-panel scrollable-panel">
      <div className="annotation-form-sticky">
        <form onSubmit={handleSubmit}>
          <table className="annotation-table">
            <thead>
              <tr>
                <th>Couleur</th>
                <th>Nom</th>
                <th>Type</th>
                <th>Touche</th>
                <th>Groupe</th>
                <th>
                  {editIndex !== null && (
                    <button
                      type="button"
                      className="icon-btn cancel-btn"
                      onClick={() => setEditIndex(null)}
                      title="Annuler"
                    >
                      ✕
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><input type="color" value={color} onChange={e => setColor(e.target.value)} /></td>
                <td><input type="text" value={name} onChange={e => setName(e.target.value)} required /></td>
                <td>
                  <select value={type} onChange={e => setType(e.target.value)}>
                    <option value="discrète">Discrète</option>
                    <option value="continue">Continue</option>
                  </select>
                </td>
                <td><input type="text" value={key} onChange={e => setKey(e.target.value.toLowerCase())} maxLength="1" required /></td>
                <td>
                  <input list="group-options" type="text" value={group} onChange={e => setGroup(e.target.value)} />
                  <datalist id="group-options">
                    {allGroups.map((g, i) => <option key={i} value={g} />)}
                  </datalist>
                </td>
                <td><button type="submit">{editIndex !== null ? "✓" : "+"}</button></td>
              </tr>
            </tbody>
          </table>
          {errorMessage && (
            <div style={{ color: 'red', marginTop: '4px', fontSize: '0.9em' }}>
              {errorMessage}
            </div>
          )}
        </form>
      </div>

      {(annotations || []).length > 0 && (
        <div className="annotation-group-wrapper ungrouped">
          <table className="annotation-table">
            <tbody>
              {annotations.map((ann, idx) => (
                <tr key={idx}>
                  <td><span className="color-square" style={{ backgroundColor: ann.color }}></span></td>
                  <td>{ann.name}</td>
                  <td>{ann.isDiscrete ? "discrète" : "continue"}</td>
                  <td>{ann.key?.toUpperCase()}</td>
                  <td>
                    <button onClick={() => handleEdit(idx)}>✎</button>
                    <button onClick={() => handleDeleteAnnotation(idx)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(liste_categories || []).map(cat => (
        <div key={cat.getName?.()} className="annotation-group-wrapper with-title">
          <div className="group-title-block">
            <strong>{cat.getName?.()}</strong>
            <div className="group-title-buttons">
              <button className="small-btn" onClick={() => handleAddToGroup(cat.getName?.())}>+</button>
              <button
                className="small-btn delete-btn"
                onClick={() => handleDeleteGroup(cat.getName?.())}
                title="Supprimer le groupe"
              >
                🗑
              </button>
            </div>
          </div>

          <table className="annotation-table">
            <tbody>
              {(cat.getAnnotations?.() || []).map((ann, idx) => (
                <tr key={idx}>
                  <td><span className="color-square" style={{ backgroundColor: ann.color }}></span></td>
                  <td>{ann.name}</td>
                  <td>{ann.isDiscrete ? "discrète" : "continue"}</td>
                  <td>{ann.key?.toUpperCase()}</td>
                  <td>
                    <button onClick={() => handleEdit(idx, true, cat.getName?.())}>✎</button>
                    <button onClick={() => handleDeleteAnnotation(idx, true, cat.getName?.())}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default AnnotationPanel;
