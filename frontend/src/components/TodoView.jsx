import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

const TodoView = ({ selectedCourseId, refreshTrigger }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTodos();
    }, []);

    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchTodos(true);
        }
    }, [refreshTrigger]);

    const fetchTodos = async (isBackground = false) => {
        if (isBackground) setIsRefreshing(true);
        else setLoading(true);
        
        setError(null);
        try {
            const res = await axios.get('/api/todos');
            setData(res.data);
        } catch (err) {
            console.error("Failed to fetch todos", err);
            setError("Kunde inte hämta att-göra-listan.");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center h-100">
                <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                <span className="text-muted small">Söker igenom klassrum...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center text-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>{error}
                <button className="btn btn-link btn-sm" onClick={() => fetchTodos()}>Försök igen</button>
            </div>
        );
    }

    // Filter based on selected course from parent
    const filteredData = selectedCourseId 
        ? data.filter(c => c.courseId === selectedCourseId) 
        : data;

    // Flatten data for a single compact table
    const allTodos = filteredData.flatMap(course => 
        course.todos.map(todo => ({ ...todo, courseName: course.courseName }))
    ).sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime)); // Sort by newest first

    if (allTodos.length === 0) {
        return (
            <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted">
                {isRefreshing ? <div className="spinner-border text-secondary mb-3" role="status"></div> : <i className="bi bi-check2-circle fs-1 opacity-25 mb-2"></i>}
                <p>Inga uppgifter att rätta {selectedCourseId ? 'i detta klassrum' : 'just nu'}!</p>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => fetchTodos()}>Uppdatera</button>
            </div>
        );
    }

    return (
        <div className={`container-fluid p-0 position-relative ${isRefreshing ? 'opacity-50' : ''}`} style={{transition: 'opacity 0.2s'}}>
            {isRefreshing && (
                <div className="position-absolute top-0 start-50 translate-middle-x mt-2 z-10">
                    <span className="badge bg-primary shadow-sm"><span className="spinner-border spinner-border-sm me-2"></span>Uppdaterar...</span>
                </div>
            )}
            
            <table className="table table-sm table-hover mb-0 w-100" style={{fontSize: '0.75rem'}}>
                <thead className="bg-light text-muted sticky-top border-bottom" style={{zIndex: 5}}>
                    <tr>
                        <th className="ps-3 py-1 fw-normal" style={{width: '20%'}}>KURS</th>
                        <th className="py-1 fw-normal" style={{width: '25%'}}>ELEV</th>
                        <th className="py-1 fw-normal" style={{width: '35%'}}>UPPGIFT</th>
                        <th className="py-1 fw-normal text-end" style={{width: '15%'}}>INLÄMNAD</th>
                        <th className="py-1 fw-normal text-center" style={{width: '5%'}}></th>
                    </tr>
                </thead>
                <tbody>
                    {allTodos.map(todo => (
                        <tr key={todo.id} className="align-middle position-relative">
                            <td className="ps-3 py-1 text-truncate" style={{maxWidth: '150px'}} title={todo.courseName}>
                                <span className="fw-bold text-dark opacity-75">{todo.courseName}</span>
                            </td>
                            <td className="py-1 text-truncate" style={{maxWidth: '200px'}}>
                                {todo.studentName}
                            </td>
                            <td className="py-1 text-truncate" style={{maxWidth: '300px'}}>
                                <a href={todo.workLink} target="_blank" rel="noreferrer" className="text-decoration-none text-dark" title={todo.workTitle}>
                                    {todo.workTitle}
                                </a>
                            </td>
                            <td className="text-end py-1 text-muted">
                                {todo.updateTime ? format(parseISO(todo.updateTime), "d MMM HH:mm", { locale: sv }) : '-'}
                            </td>
                            <td className="text-center py-1">
                                <a href={todo.submissionLink} target="_blank" rel="noreferrer" className="stretched-link text-primary" title="Öppna inlämning">
                                    <i className="bi bi-box-arrow-up-right"></i>
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <div className="text-center p-2 bg-light border-top text-muted small">
                {allTodos.length} inlämningar att rätta.
            </div>
        </div>
    );
};

export default TodoView;